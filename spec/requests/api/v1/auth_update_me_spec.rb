require "rails_helper"

RSpec.describe "PATCH /api/v1/auth/me", type: :request do
  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  let(:avatar_file) { fixture_file_upload("test_avatar.png", "image/png") }
  let(:fake_image) { fixture_file_upload("fake_image.png", "image/png") }

  it "updates plain fields with a normal JSON request" do
    user = create(:user, first_name: "Old")

    patch "/api/v1/auth/me", params: { user: { first_name: "New" } }, headers: auth_header(user), as: :json

    expect(response).to have_http_status(:ok)
    expect(user.reload.first_name).to eq("New")
  end

  it "attaches an uploaded avatar and returns a real URL for it" do
    user = create(:user)

    patch "/api/v1/auth/me", params: { "user[first_name]" => "Ann", avatar: avatar_file }, headers: auth_header(user)

    expect(response).to have_http_status(:ok)
    expect(user.reload.avatar).to be_attached
    json = JSON.parse(response.body)
    expect(json["avatar_url"]).to include("/rails/active_storage/")
  end

  it "rejects a non-image file even if it's named/declared as one (byte-sniffed, not trusted)" do
    user = create(:user)

    patch "/api/v1/auth/me", params: { avatar: fake_image }, headers: auth_header(user)

    expect(response).to have_http_status(:unprocessable_entity)
    expect(user.reload.avatar).not_to be_attached
  end

  it "falls back to the plain avatar_url string when no file was ever uploaded" do
    user = create(:user, avatar_url: "https://example.com/pic.jpg")

    get "/api/v1/auth/me", headers: auth_header(user)

    json = JSON.parse(response.body)
    expect(json["avatar_url"]).to eq("https://example.com/pic.jpg")
  end
end
