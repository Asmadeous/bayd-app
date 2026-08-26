require "rails_helper"

RSpec.describe "Device tokens", type: :request do
  let(:user)  { create(:user) }
  let(:other) { create(:user) }

  def auth_header(u)
    token = JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "registers a token for the current user" do
    expect {
      post "/api/v1/device_tokens", params: { token: "tok-abc", platform: "ios" }, headers: auth_header(user), as: :json
    }.to change { user.device_tokens.count }.by(1)
    expect(response).to have_http_status(:created)
  end

  it "upserts (registering the same token twice keeps one row, latest owner)" do
    post "/api/v1/device_tokens", params: { token: "shared" }, headers: auth_header(user), as: :json
    expect {
      post "/api/v1/device_tokens", params: { token: "shared" }, headers: auth_header(other), as: :json
    }.not_to change(DeviceToken, :count)
    expect(DeviceToken.find_by(token: "shared").user).to eq(other)
  end

  it "unregisters the current user's token" do
    create(:device_token, user: user, token: "gone")
    expect {
      delete "/api/v1/device_tokens", params: { token: "gone" }, headers: auth_header(user), as: :json
    }.to change { user.device_tokens.count }.by(-1)
    expect(response).to have_http_status(:no_content)
  end

  it "won't unregister another user's token" do
    create(:device_token, user: other, token: "theirs")
    delete "/api/v1/device_tokens", params: { token: "theirs" }, headers: auth_header(user), as: :json
    expect(DeviceToken.exists?(token: "theirs")).to be(true)
  end

  it "requires auth" do
    post "/api/v1/device_tokens", params: { token: "x" }, as: :json
    expect(response).to have_http_status(:unauthorized)
  end
end
