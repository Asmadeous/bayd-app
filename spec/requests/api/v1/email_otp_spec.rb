require "rails_helper"

RSpec.describe "Email OTP login", type: :request do
  describe "POST /auth/email_code" do
    it "issues a code, mails it, and responds sent" do
      expect {
        post "/api/v1/auth/email_code", params: { email: "newuser@example.com" }, as: :json
      }.to change(EmailVerification, :count).by(1)
        .and have_enqueued_mail(MagicLinkMailer, :email_code)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["status"]).to eq("sent")
    end

    it "requires an email" do
      post "/api/v1/auth/email_code", params: {}, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rate-limits a too-soon resend" do
      post "/api/v1/auth/email_code", params: { email: "newuser@example.com" }, as: :json
      post "/api/v1/auth/email_code", params: { email: "newuser@example.com" }, as: :json
      expect(response).to have_http_status(:too_many_requests)
    end

    it "refuses an email that belongs to a staff account" do
      create(:user, email: "staff@baydspa.ca", role: :employee)
      post "/api/v1/auth/email_code", params: { email: "staff@baydspa.ca" }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /auth/email_code/verify" do
    it "logs in (find-or-create) with a valid code and returns a token" do
      _record, raw = EmailVerification.issue!("newuser@example.com")

      expect {
        post "/api/v1/auth/email_code/verify", params: { email: "newuser@example.com", code: raw }, as: :json
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["token"]).to be_present
      expect(User.find_by(email: "newuser@example.com").role).to eq("customer")
    end

    it "reuses an existing customer with the same email" do
      customer = create(:user, email: "c@example.com")
      _record, raw = EmailVerification.issue!("c@example.com")

      expect {
        post "/api/v1/auth/email_code/verify", params: { email: "c@example.com", code: raw }, as: :json
      }.not_to change(User, :count)
      expect(response.parsed_body["user"]["id"]).to eq(customer.id)
    end

    it "rejects a bad code" do
      EmailVerification.issue!("newuser@example.com")
      post "/api/v1/auth/email_code/verify", params: { email: "newuser@example.com", code: "000000" }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "refuses an email that belongs to a staff account" do
      create(:user, email: "staff@baydspa.ca", role: :employee)
      _record, raw = EmailVerification.issue!("staff@baydspa.ca")
      post "/api/v1/auth/email_code/verify", params: { email: "staff@baydspa.ca", code: raw }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    context "app-review demo bypass" do
      around do |ex|
        ClimateControl.modify(APP_REVIEW_DEMO_EMAIL: "appreview@baydspa.ca", APP_REVIEW_DEMO_CODE: "424242") { ex.run }
      rescue NameError
        # ClimateControl not available - set/unset ENV directly
        ENV["APP_REVIEW_DEMO_EMAIL"] = "appreview@baydspa.ca"
        ENV["APP_REVIEW_DEMO_CODE"]  = "424242"
        ex.run
      ensure
        ENV.delete("APP_REVIEW_DEMO_EMAIL")
        ENV.delete("APP_REVIEW_DEMO_CODE")
      end

      it "logs the demo email in with the fixed code (no real OTP)" do
        post "/api/v1/auth/email_code/verify", params: { email: "appreview@baydspa.ca", code: "424242" }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["token"]).to be_present
      end

      it "rejects the demo email with the wrong code" do
        post "/api/v1/auth/email_code/verify", params: { email: "appreview@baydspa.ca", code: "000000" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end

      it "does not let any other email use the demo code" do
        post "/api/v1/auth/email_code/verify", params: { email: "someone@example.com", code: "424242" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
