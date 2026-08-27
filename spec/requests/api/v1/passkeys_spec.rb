require "rails_helper"
require "webauthn/fake_client"

# Exercises the full passkey ceremony end-to-end with WebAuthn::FakeClient (a
# software authenticator), so the real crypto path is verified without a device.
RSpec.describe "Passkeys (WebAuthn)", type: :request do
  let(:origin) { "http://localhost" }
  let(:user)   { create(:user, email: "ada@example.com") }
  let(:fake_client) { WebAuthn::FakeClient.new(origin) }

  def auth_header(u)
    token = JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  around do |example|
    original = WebAuthn.configuration.allowed_origins
    WebAuthn.configuration.allowed_origins = [ origin ]
    example.run
  ensure
    WebAuthn.configuration.allowed_origins = original
  end

  # Register a passkey for `user` (the authed flow) and return the created credential.
  def register_passkey!
    post "/api/v1/auth/passkeys/registration_options", headers: auth_header(user), as: :json
    challenge = response.parsed_body["challenge"]
    credential = fake_client.create(challenge: challenge, user_verified: true)

    post "/api/v1/auth/passkeys/register",
         params: { credential: credential }, headers: auth_header(user), as: :json
    credential
  end

  it "registers a passkey for the logged-in user" do
    expect { register_passkey! }.to change { user.webauthn_credentials.count }.by(1)
    expect(response).to have_http_status(:created)
  end

  it "authenticates with the registered passkey and returns a token (no password)" do
    register_passkey!

    post "/api/v1/auth/passkeys/authentication_options", params: { email: user.email }, as: :json
    challenge = response.parsed_body["challenge"]
    assertion = fake_client.get(challenge: challenge, user_verified: true)

    post "/api/v1/auth/passkeys/authenticate",
         params: { email: user.email, credential: assertion }, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["token"]).to be_present
    expect(response.parsed_body["user"]["id"]).to eq(user.id)
  end

  it "registration requires authentication" do
    post "/api/v1/auth/passkeys/registration_options", as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects authentication when the user has no registered passkey" do
    # The client holds a credential, but the user's account has none stored, so
    # authentication_options returns no allow-list / no challenge and the server
    # refuses the assertion.
    fake_client.create(challenge: WebAuthn.configuration.encoder.encode(SecureRandom.random_bytes(32)), user_verified: true)

    post "/api/v1/auth/passkeys/authentication_options", params: { email: user.email }, as: :json
    assertion = fake_client.get(challenge: response.parsed_body["challenge"], user_verified: true)

    post "/api/v1/auth/passkeys/authenticate",
         params: { email: user.email, credential: assertion }, as: :json
    expect(response).to have_http_status(:unauthorized)
  end
end
