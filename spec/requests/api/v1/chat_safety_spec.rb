require "rails_helper"

# Block and report in chat (Apple guideline 1.2): either person can block the
# other, which stops messages both ways, and report them, which alerts admins.
RSpec.describe "Chat block and report", type: :request do
  let(:alice) { create(:user, email: "alice@example.com", first_name: "Alice") }
  let(:bob)   { create(:user, email: "bob@baydspa.ca", first_name: "Bob", role: :employee) }
  let!(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:bob_profile) { create(:employee_profile, user: bob) }
  let(:service) { create(:service, duration_minutes: 60, price: 80) }
  let(:convo) { Conversation.between(alice, bob) }

  # Customer <-> tech messaging is only open around a shared booking.
  before do
    Booking.create!(user: alice, employee_profile: bob_profile, service: service, status: "confirmed",
                    starts_at: 10.minutes.from_now, ends_at: 70.minutes.from_now, subtotal: 80, travel_fee: 0, total: 80)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def send_message(from, body = "hi")
    post "/api/v1/conversations/#{convo.id}/messages", params: { body: body }, headers: auth_header(from), as: :json
  end

  describe "block" do
    it "stops messages in both directions and shows the state to each side" do
      post "/api/v1/conversations/#{convo.id}/block", headers: auth_header(alice)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("blocked_by_me" => true, "blocked_me" => false)

      send_message(alice)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["code"]).to eq("blocked")

      send_message(bob)
      expect(response).to have_http_status(:unprocessable_entity)

      get "/api/v1/conversations/#{convo.id}", headers: auth_header(bob)
      expect(response.parsed_body).to include("blocked_by_me" => false, "blocked_me" => true)
    end

    it "lets messaging resume after unblocking" do
      post "/api/v1/conversations/#{convo.id}/block", headers: auth_header(alice)
      delete "/api/v1/conversations/#{convo.id}/block", headers: auth_header(alice)
      expect(response.parsed_body["blocked_by_me"]).to be(false)

      send_message(alice)
      expect(response).to have_http_status(:created)
    end

    it "can't block in a conversation you're not part of" do
      stranger = create(:user, email: "x@example.com")
      post "/api/v1/conversations/#{convo.id}/block", headers: auth_header(stranger)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "report" do
    it "records the report and alerts every admin" do
      expect {
        post "/api/v1/conversations/#{convo.id}/report",
             params: { reason: "Harassment or abuse", details: "rude messages" }, headers: auth_header(alice), as: :json
      }.to have_enqueued_mail(AdminMailer, :chat_reported)

      expect(response).to have_http_status(:created)
      report = ChatReport.last
      expect(report).to have_attributes(reporter: alice, reported_user: bob, reason: "Harassment or abuse",
                                        details: "rude messages", status: "open")
      note = Notification.find_by(user: admin, kind: "chat_reported")
      expect(note.title).to start_with("Chat report: Bob")
    end

    it "rejects a reason that isn't on the list" do
      post "/api/v1/conversations/#{convo.id}/report", params: { reason: "whatever" }, headers: auth_header(alice), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(ChatReport.count).to eq(0)
    end
  end
end
