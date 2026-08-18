require "rails_helper"

RSpec.describe "Staff password reset", type: :request do
  describe "POST /api/v1/auth/password_reset" do
    it "emails a reset link for a staff account" do
      staff = create(:user, email: "staff@baydspa.ca", role: :employee, password: "originalpass1")

      expect {
        post "/api/v1/auth/password_reset", params: { email: "staff@baydspa.ca" }, as: :json
      }.to have_enqueued_mail(MagicLinkMailer, :password_reset)

      expect(response).to have_http_status(:ok)
      expect(MagicLinkToken.where(user: staff, purpose: "password_reset").count).to eq(1)
    end

    it "does NOT email a customer (nothing to reset) but still responds success" do
      create(:user, email: "customer@example.com", role: :customer)

      expect {
        post "/api/v1/auth/password_reset", params: { email: "customer@example.com" }, as: :json
      }.not_to have_enqueued_mail(MagicLinkMailer, :password_reset)

      expect(response).to have_http_status(:ok)
    end

    it "responds success for an unknown email (no account enumeration)" do
      post "/api/v1/auth/password_reset", params: { email: "nobody@example.com" }, as: :json
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /api/v1/auth/password_reset/confirm" do
    it "sets the new password and consumes the token" do
      staff = create(:user, email: "reset-me@baydspa.ca", role: :employee, password: "originalpass1")
      raw = MagicLinkToken.issue!(staff, purpose: "password_reset")

      post "/api/v1/auth/password_reset/confirm", params: { token: raw, password: "brandnewpass1" }, as: :json

      expect(response).to have_http_status(:ok)
      expect(staff.reload.authenticate("brandnewpass1")).to eq(staff)
      expect(staff.authenticate("originalpass1")).to be false
    end

    it "rejects a too-short password" do
      staff = create(:user, email: "shortpw@baydspa.ca", role: :employee, password: "originalpass1")
      raw = MagicLinkToken.issue!(staff, purpose: "password_reset")

      post "/api/v1/auth/password_reset/confirm", params: { token: raw, password: "short" }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(staff.reload.authenticate("originalpass1")).to eq(staff)
    end

    it "rejects an invalid or already-used token" do
      post "/api/v1/auth/password_reset/confirm", params: { token: "bogus", password: "brandnewpass1" }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "a sign_in-purpose token can't be used to reset a password" do
      staff = create(:user, email: "crosspurpose@baydspa.ca", role: :employee, password: "originalpass1")
      raw = MagicLinkToken.issue!(staff, purpose: "sign_in")

      post "/api/v1/auth/password_reset/confirm", params: { token: raw, password: "brandnewpass1" }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(staff.reload.authenticate("originalpass1")).to eq(staff)
    end

    it "the token can't be reused" do
      staff = create(:user, email: "onceonly@baydspa.ca", role: :employee, password: "originalpass1")
      raw = MagicLinkToken.issue!(staff, purpose: "password_reset")

      post "/api/v1/auth/password_reset/confirm", params: { token: raw, password: "firstchange1" }, as: :json
      post "/api/v1/auth/password_reset/confirm", params: { token: raw, password: "secondchange1" }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(staff.reload.authenticate("firstchange1")).to eq(staff)
    end
  end
end
