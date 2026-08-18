require "rails_helper"

RSpec.describe "Magic-link sign-in", type: :request do
  describe "POST /api/v1/auth/magic_link" do
    it "emails a sign-in link when the address belongs to an account" do
      user = create(:user, email: "known@example.com")

      expect {
        post "/api/v1/auth/magic_link", params: { email: "known@example.com" }, as: :json
      }.to have_enqueued_mail(MagicLinkMailer, :sign_in)

      expect(response).to have_http_status(:ok)
      expect(MagicLinkToken.where(user: user).count).to eq(1)
    end

    it "responds success WITHOUT sending mail for an unknown email (no account enumeration)" do
      expect {
        post "/api/v1/auth/magic_link", params: { email: "nobody@example.com" }, as: :json
      }.not_to have_enqueued_mail(MagicLinkMailer, :sign_in)

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["message"]).to be_present
    end

    it "403s for a staff/admin email (never gets a magic link) so the UI can prompt for a password" do
      create(:user, email: "staff@example.com", role: :employee, password: "supersecret1")

      expect {
        post "/api/v1/auth/magic_link", params: { email: "staff@example.com" }, as: :json
      }.not_to have_enqueued_mail(MagicLinkMailer, :sign_in)

      expect(response).to have_http_status(:forbidden)
    end

    it "is reachable without authentication" do
      post "/api/v1/auth/magic_link", params: { email: "anyone@example.com" }, as: :json
      expect(response).not_to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/auth/magic_link/verify" do
    it "redirects to the frontend callback with a working JWT for a valid token" do
      user = create(:user)
      raw = MagicLinkToken.issue!(user)

      get "/api/v1/auth/magic_link/verify", params: { token: raw }

      expect(response).to have_http_status(:found)
      expect(response.location).to match(%r{/auth/callback\?token=})
    end

    it "consumes the token so it can't be reused (single-use)" do
      user = create(:user)
      raw = MagicLinkToken.issue!(user)

      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      first_location = response.location

      get "/api/v1/auth/magic_link/verify", params: { token: raw }

      expect(response.location).not_to eq(first_location)
      expect(response.location).to match(/signin\?error=invalid_or_expired/)
    end

    it "redirects to sign-in with an error for a bogus token" do
      get "/api/v1/auth/magic_link/verify", params: { token: "not-a-real-token" }

      expect(response).to have_http_status(:found)
      expect(response.location).to match(/signin\?error=invalid_or_expired/)
    end

    it "redirects to sign-in with an error for an expired token" do
      user = create(:user)
      raw = MagicLinkToken.issue!(user)
      MagicLinkToken.last.update!(expires_at: 1.minute.ago)

      get "/api/v1/auth/magic_link/verify", params: { token: raw }

      expect(response.location).to match(/signin\?error=invalid_or_expired/)
    end

    it "the issued token actually authenticates as the right user" do
      user = create(:user)
      raw = MagicLinkToken.issue!(user)

      get "/api/v1/auth/magic_link/verify", params: { token: raw }
      jwt = response.location[/token=([^&]+)/, 1]

      get "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{jwt}" }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(user.id)
    end
  end
end
