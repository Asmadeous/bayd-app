require "rails_helper"

# Regression guard: the app is api_only, which strips the cookie middleware.
# GoogleAuthController#start writes the anti-CSRF `state` to cookies.encrypted,
# so without ActionDispatch::Cookies re-added in config/application.rb this
# route 500s with NoMethodError before it can redirect to Google.
RSpec.describe "Google OAuth", type: :request do
  before do
    ENV["GOOGLE_CLIENT_ID"] = "test-client-id.apps.googleusercontent.com"
    ENV["GOOGLE_REDIRECT_URI"] = "https://api.baydspa.ca/api/v1/auth/google/callback"
  end

  describe "GET /api/v1/auth/google" do
    it "redirects the browser to Google's consent screen (does not 500)" do
      get "/api/v1/auth/google"

      expect(response).to have_http_status(:found)
      expect(response.headers["Location"]).to start_with("https://accounts.google.com/o/oauth2/v2/auth")
    end

    it "includes our client_id and registered redirect_uri in the auth URL" do
      get "/api/v1/auth/google"

      location = response.headers["Location"]
      expect(location).to include("client_id=test-client-id")
      expect(location).to include(CGI.escape("https://api.baydspa.ca/api/v1/auth/google/callback"))
    end

    it "sets the encrypted anti-CSRF state cookie" do
      get "/api/v1/auth/google"

      expect(response.cookies).to have_key("google_oauth_state")
    end
  end

  describe "GET /api/v1/auth/google/callback" do
    it "redirects to the frontend with an error when state is missing (no cookie)" do
      get "/api/v1/auth/google/callback", params: { code: "x", state: "nope" }

      expect(response).to have_http_status(:found)
      expect(response.headers["Location"]).to include("error=state_mismatch")
    end
  end
end

# What a Google sign-in saves to the account: name and photo from Google, and
# never overwriting what the customer already set.
RSpec.describe Api::V1::GoogleAuthController do
  subject(:controller) { described_class.new }

  let(:google) do
    { "sub" => "g-123", "email" => "kim@example.com", "given_name" => "Kim", "family_name" => "Lee",
      "picture" => "https://lh3.googleusercontent.com/a/photo" }
  end

  it "creates a customer with Google's name and photo" do
    user = controller.send(:find_or_create_from_google, google)

    expect(user).to have_attributes(first_name: "Kim", last_name: "Lee", google_uid: "g-123",
                                     avatar_url: "https://lh3.googleusercontent.com/a/photo")
    expect(user).to be_customer
  end

  it "fills gaps on an existing account without overwriting it" do
    existing = User.create!(email: "kim@example.com", first_name: "Kimberly", role: :customer)

    user = controller.send(:find_or_create_from_google, google)

    expect(user.id).to eq(existing.id)
    expect(user).to have_attributes(first_name: "Kimberly", last_name: "Lee", google_uid: "g-123",
                                     avatar_url: "https://lh3.googleusercontent.com/a/photo")
  end
end
