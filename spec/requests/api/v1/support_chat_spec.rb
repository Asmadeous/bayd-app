require "rails_helper"

RSpec.describe "Website support chat", type: :request do
  let!(:admin) { create(:user, role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def start_chat(headers: {}, body: "Do you come to Oakville?")
    post "/api/v1/support/threads",
         params: { thread: { name: "Ada", email: "ada@example.com" }, body: body },
         headers: headers, as: :json
  end

  describe "as a guest" do
    it "starts a thread without an account and gets a token back" do
      expect { start_chat }.to change(SupportThread, :count).by(1)

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body["token"]).to be_present
      expect(body.dig("thread", "messages").map { |m| m["body"] }).to eq([ "Do you come to Oakville?" ])
      expect(SupportThread.last.user).to be_nil
    end

    it "rejects an empty first message and creates nothing" do
      expect { start_chat(body: " ") }.not_to change(SupportThread, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "reads and replies with the token only" do
      start_chat
      token = response.parsed_body["token"]

      post "/api/v1/support/threads/#{token}/messages", params: { body: "Thanks!" }, as: :json
      expect(response).to have_http_status(:created)

      get "/api/v1/support/threads/#{token}"
      expect(response.parsed_body["messages"].size).to eq(2)
    end

    it "404s for a wrong token" do
      get "/api/v1/support/threads/not-a-real-token"
      expect(response).to have_http_status(:not_found)
    end
  end

  it "links the thread to a signed-in customer" do
    customer = create(:user)
    start_chat(headers: auth_header(customer))
    expect(SupportThread.last.user).to eq(customer)
  end

  describe "admin inbox" do
    it "lists threads, shows messages, and replies the visitor can read" do
      start_chat
      token = response.parsed_body["token"]
      thread = SupportThread.last

      get "/api/v1/admin/support_threads", headers: auth_header(admin)
      expect(response.parsed_body["data"].first).to include("name" => "Ada", "unread_count" => 1)

      get "/api/v1/admin/support_threads/#{thread.id}", headers: auth_header(admin)
      expect(thread.reload.unread_for_staff).to eq(0)

      post "/api/v1/admin/support_threads/#{thread.id}/reply",
           params: { body: "Yes we do!" }, headers: auth_header(admin), as: :json
      expect(response).to have_http_status(:created)

      get "/api/v1/support/threads/#{token}"
      last = response.parsed_body["messages"].last
      expect(last).to include("body" => "Yes we do!", "from_staff" => true)
      expect(response.parsed_body["unread_count"]).to eq(1)

      get "/api/v1/support/threads/#{token}", params: { mark_read: true }
      expect(response.parsed_body["unread_count"]).to eq(0)
    end

    it "closes a thread, and a visitor message reopens it" do
      start_chat
      token = response.parsed_body["token"]
      thread = SupportThread.last

      patch "/api/v1/admin/support_threads/#{thread.id}",
            params: { status: "closed" }, headers: auth_header(admin), as: :json
      expect(thread.reload).to be_closed

      post "/api/v1/support/threads/#{token}/messages", params: { body: "One more thing" }, as: :json
      expect(thread.reload).to be_open
    end

    it "is admin-only" do
      get "/api/v1/admin/support_threads", headers: auth_header(create(:user))
      expect(response).to have_http_status(:forbidden)
    end
  end
end
