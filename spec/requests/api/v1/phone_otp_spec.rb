require "rails_helper"

RSpec.describe "Phone OTP login", type: :request do
  before do
    # Never send a real SMS; make Infobip "configured" so request_code returns :sent.
    allow_any_instance_of(Infobip::Client).to receive(:configured?).and_return(true)
    allow_any_instance_of(Infobip::Client).to receive(:send_sms).and_return(:ok)
  end

  describe "POST /auth/phone_code" do
    it "issues a code and responds sent" do
      expect {
        post "/api/v1/auth/phone_code", params: { phone: "+14165550100" }, as: :json
      }.to change(PhoneVerification, :count).by(1)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["status"]).to eq("sent")
    end

    it "requires a phone number" do
      post "/api/v1/auth/phone_code", params: {}, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rate-limits a too-soon resend" do
      post "/api/v1/auth/phone_code", params: { phone: "+14165550100" }, as: :json
      post "/api/v1/auth/phone_code", params: { phone: "+14165550100" }, as: :json
      expect(response).to have_http_status(:too_many_requests)
    end
  end

  describe "POST /auth/phone_code/verify" do
    it "logs in (find-or-create) with a valid code and returns a token" do
      _record, raw = PhoneVerification.issue!("+14165550100")

      expect {
        post "/api/v1/auth/phone_code/verify", params: { phone: "+14165550100", code: raw }, as: :json
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["token"]).to be_present
      expect(User.find_by(phone: "+14165550100").role).to eq("customer")
    end

    it "reuses an existing customer with the same phone" do
      customer = create(:user, phone: "+14165550100", email: "c@example.com")
      _record, raw = PhoneVerification.issue!("+14165550100")

      expect {
        post "/api/v1/auth/phone_code/verify", params: { phone: "+14165550100", code: raw }, as: :json
      }.not_to change(User, :count)
      expect(response.parsed_body["user"]["id"]).to eq(customer.id)
    end

    it "seeds a new account with the signup email + first_name" do
      _record, raw = PhoneVerification.issue!("+14165550101")

      post "/api/v1/auth/phone_code/verify",
        params: { phone: "+14165550101", code: raw, email: "New@Example.com", first_name: "Nina" },
        as: :json

      expect(response).to have_http_status(:ok)
      user = User.find_by(phone: "+14165550101")
      expect(user.email).to eq("new@example.com")
      expect(user.first_name).to eq("Nina")
    end

    it "does not overwrite an existing customer's details on a later phone sign-in" do
      customer = create(:user, phone: "+14165550100", email: "keep@example.com", first_name: "Keep")
      _record, raw = PhoneVerification.issue!("+14165550100")

      post "/api/v1/auth/phone_code/verify",
        params: { phone: "+14165550100", code: raw, email: "other@example.com", first_name: "Other" },
        as: :json

      expect(customer.reload.email).to eq("keep@example.com")
      expect(customer.first_name).to eq("Keep")
    end

    it "rejects a bad code" do
      PhoneVerification.issue!("+14165550100")
      post "/api/v1/auth/phone_code/verify", params: { phone: "+14165550100", code: "000000" }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "refuses a phone that belongs to a staff account" do
      create(:user, phone: "+14165550199", email: "tech@baydspa.ca", role: :employee)
      _record, raw = PhoneVerification.issue!("+14165550199")
      post "/api/v1/auth/phone_code/verify", params: { phone: "+14165550199", code: raw }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
