require "rails_helper"

RSpec.describe "Conversations + messages", type: :request do
  let(:alice) { create(:user, email: "alice@example.com") }
  let(:bob)   { create(:user, email: "bob@baydspa.ca", role: :employee) }
  let(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "GET /conversations" do
    it "returns only the current user's conversations, newest first" do
      mine  = Conversation.between(alice, bob)
      other = Conversation.between(bob, admin) # not alice's
      mine.messages.create!(sender: bob, body: "hi alice")

      get "/api/v1/conversations", headers: auth_header(alice)
      expect(response).to have_http_status(:ok)
      ids = response.parsed_body.map { |c| c["id"] }
      expect(ids).to include(mine.id)
      expect(ids).not_to include(other.id)
    end

    it "includes the other participant and unread count for the viewer" do
      convo = Conversation.between(alice, bob)
      convo.messages.create!(sender: bob, body: "yo")

      get "/api/v1/conversations", headers: auth_header(alice)
      row = response.parsed_body.first
      expect(row["other_participant"]["id"]).to eq(bob.id)
      expect(row["unread_count"]).to eq(1)
    end

    it "requires auth" do
      get "/api/v1/conversations"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /conversations" do
    it "finds or creates the conversation with another user" do
      expect {
        post "/api/v1/conversations", params: { user_id: bob.id }, headers: auth_header(alice), as: :json
      }.to change(Conversation, :count).by(1)
      expect(response).to have_http_status(:created)

      # idempotent — second call reuses it
      expect {
        post "/api/v1/conversations", params: { user_id: bob.id }, headers: auth_header(alice), as: :json
      }.not_to change(Conversation, :count)
    end

    it "refuses a self-conversation" do
      post "/api/v1/conversations", params: { user_id: alice.id }, headers: auth_header(alice), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "messages" do
    let(:convo) { Conversation.between(alice, bob) }

    it "lists a conversation's messages for a participant" do
      convo.messages.create!(sender: alice, body: "one")
      convo.messages.create!(sender: bob, body: "two")

      get "/api/v1/conversations/#{convo.id}/messages", headers: auth_header(alice)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].map { |m| m["body"] }).to eq(%w[one two])
    end

    it "posts a message as a participant" do
      expect {
        post "/api/v1/conversations/#{convo.id}/messages", params: { body: "hey" }, headers: auth_header(alice), as: :json
      }.to change { convo.messages.count }.by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["sender_id"]).to eq(alice.id)
    end

    it "forbids a non-participant" do
      stranger = create(:user, email: "stranger@example.com")
      get "/api/v1/conversations/#{convo.id}/messages", headers: auth_header(stranger)
      expect(response).to have_http_status(:forbidden)
    end

    it "lets an admin access any conversation" do
      convo.messages.create!(sender: alice, body: "private")
      get "/api/v1/conversations/#{convo.id}/messages", headers: auth_header(admin)
      expect(response).to have_http_status(:ok)
    end
  end
end
