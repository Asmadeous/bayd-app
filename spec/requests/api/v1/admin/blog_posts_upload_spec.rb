require "rails_helper"

RSpec.describe "Admin blog post cover image upload", type: :request do
  let(:admin) { create(:user, email: "owner@baydspa.ca", role: :admin) }
  let(:cover_file) { fixture_file_upload("test_avatar.png", "image/png") }
  let(:fake_image) { fixture_file_upload("fake_image.png", "image/png") }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "attaches an uploaded cover image on create and returns a real URL for it" do
    post "/api/v1/admin/blog_posts",
         params: { title: "New Post", body: "Body text", cover_image: cover_file },
         headers: auth_header(admin)

    expect(response).to have_http_status(:created)
    json = JSON.parse(response.body)
    post_record = BlogPost.find(json["id"])
    expect(post_record.cover_image).to be_attached
    expect(json["cover_image_url"]).to include("/rails/active_storage/")
  end

  it "attaches an uploaded cover image on update" do
    existing = create(:blog_post)

    patch "/api/v1/admin/blog_posts/#{existing.id}", params: { cover_image: cover_file }, headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    expect(existing.reload.cover_image).to be_attached
  end

  it "falls back to the plain cover_image_url string when no file was ever uploaded" do
    existing = create(:blog_post, cover_image_url: "https://example.com/cover.jpg")

    get "/api/v1/admin/blog_posts/#{existing.id}", headers: auth_header(admin)

    json = JSON.parse(response.body)
    expect(json["cover_image_url"]).to eq("https://example.com/cover.jpg")
  end

  it "rejects a non-image file even if it's named/declared as one" do
    post "/api/v1/admin/blog_posts",
         params: { title: "New Post", body: "Body text", cover_image: fake_image },
         headers: auth_header(admin)

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
