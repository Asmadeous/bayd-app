require "rails_helper"

# File uploads (Active Storage) for the admin catalog surfaces that previously
# only accepted an image_url string: products, services, product categories, and
# employee photos. Mirrors the gallery/blog upload specs. Gallery and blog have
# their own specs already.
RSpec.describe "Admin image uploads", type: :request do
  let(:admin)      { create(:user, email: "owner@baydspa.ca", role: :admin) }
  let(:image_file) { fixture_file_upload("test_avatar.png", "image/png") }
  let(:fake_image) { fixture_file_upload("fake_image.png", "image/png") }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "products" do
    it "creates a product from an uploaded image and serves the blob url" do
      post "/api/v1/admin/products",
           params: { name: "Lash Serum", price: 28, stock_quantity: 5, image: image_file },
           headers: auth_header(admin)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      product = Product.find(json["id"])
      expect(product.image).to be_attached
      expect(json["image_url"]).to include("/rails/active_storage/")
    end

    it "rejects a non-image file" do
      post "/api/v1/admin/products",
           params: { name: "Bad", price: 1, stock_quantity: 1, image: fake_image },
           headers: auth_header(admin)
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "public shop falls back to the plain image_url when nothing was uploaded" do
      create(:product, image_url: "https://example.com/p.jpg", active: true, stock_quantity: 3)
      get "/api/v1/products"
      json = JSON.parse(response.body)
      expect(json["data"].first["image_url"]).to eq("https://example.com/p.jpg")
    end
  end

  describe "services" do
    let(:category) { create(:service_category) }

    it "creates a service from an uploaded image and serves the blob url" do
      post "/api/v1/admin/services",
           params: { name: "Manicure", duration_minutes: 30, price: 40,
                     service_category_id: category.id, image: image_file },
           headers: auth_header(admin)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      service = Service.find(json["id"])
      expect(service.image).to be_attached
      expect(json["image_url"]).to include("/rails/active_storage/")
    end

    it "rejects a non-image file" do
      post "/api/v1/admin/services",
           params: { name: "Bad", duration_minutes: 30, price: 40,
                     service_category_id: category.id, image: fake_image },
           headers: auth_header(admin)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "product categories" do
    it "creates a category from an uploaded image and serves the blob url" do
      post "/api/v1/admin/product_categories",
           params: { name: "Lashes", slug: "lashes", image: image_file },
           headers: auth_header(admin)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      cat = ProductCategory.find(json["id"])
      expect(cat.image).to be_attached
      expect(json["image_url"]).to include("/rails/active_storage/")
    end
  end
end
