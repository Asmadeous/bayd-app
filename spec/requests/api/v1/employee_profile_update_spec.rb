require "rails_helper"

RSpec.describe "PATCH /api/v1/employee/profile", type: :request do
  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  let(:photo_file) { fixture_file_upload("test_avatar.png", "image/png") }
  let(:fake_image) { fixture_file_upload("fake_image.png", "image/png") }
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile) { create(:employee_profile, user: tech_user) }

  it "updates plain fields with a normal JSON request" do
    patch "/api/v1/employee/profile", params: { employee: { title: "Senior Tech" } },
                                       headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:ok)
    expect(profile.reload.title).to eq("Senior Tech")
  end

  it "attaches an uploaded photo and returns a real URL for it" do
    patch "/api/v1/employee/profile", params: { "employee[title]" => "Senior Tech", photo: photo_file },
                                       headers: auth_header(tech_user)

    expect(response).to have_http_status(:ok)
    expect(profile.reload.photo).to be_attached
    json = JSON.parse(response.body)
    expect(json["photo_url"]).to include("/rails/active_storage/")
  end

  it "rejects a non-image file even if it's named/declared as one" do
    patch "/api/v1/employee/profile", params: { photo: fake_image }, headers: auth_header(tech_user)

    expect(response).to have_http_status(:unprocessable_entity)
    expect(profile.reload.photo).not_to be_attached
  end

  it "shows the tech their own contact details, bio and coverage" do
    profile.update!(bio: "Twenty years of nails", service_fsas: [ "L5L" ])
    tech_user.update!(phone: "4165550142")

    get "/api/v1/employee/profile", headers: auth_header(tech_user)
    json = JSON.parse(response.body)

    expect(json["bio"]).to eq("Twenty years of nails")
    expect(json["service_fsas"]).to eq([ "L5L" ])
    expect(json.dig("user", "email")).to eq("tech@baydspa.ca")
    expect(json.dig("user", "phone")).to eq("4165550142")
  end
end
