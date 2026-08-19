require "rails_helper"

RSpec.describe "Admin gallery item image upload", type: :request do
  let(:admin) { create(:user, email: "owner@baydspa.ca", role: :admin) }
  let(:image_file) { fixture_file_upload("test_avatar.png", "image/png") }
  let(:fake_image) { fixture_file_upload("fake_image.png", "image/png") }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "creates a gallery item from an uploaded image with no image_url" do
    post "/api/v1/admin/gallery_items",
         params: { title: "New Look", category: "Nails", size: "standard", image: image_file },
         headers: auth_header(admin)

    expect(response).to have_http_status(:created)
    json = JSON.parse(response.body)
    item = GalleryItem.find(json["id"])
    expect(item.image).to be_attached
    expect(json["image_url"]).to include("/rails/active_storage/")
  end

  it "rejects a gallery item with neither an uploaded image nor an image_url" do
    post "/api/v1/admin/gallery_items",
         params: { title: "No Image", category: "Nails", size: "standard" },
         headers: auth_header(admin)

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "public index falls back to the plain image_url string when no file was ever uploaded" do
    create(:gallery_item, image_url: "https://example.com/pic.jpg", active: true)

    get "/api/v1/gallery_items"

    json = JSON.parse(response.body)
    expect(json.first["image_url"]).to eq("https://example.com/pic.jpg")
  end

  it "rejects a non-image file even if it's named/declared as one" do
    post "/api/v1/admin/gallery_items",
         params: { title: "New Look", category: "Nails", size: "standard", image: fake_image },
         headers: auth_header(admin)

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
