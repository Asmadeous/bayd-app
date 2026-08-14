require "rails_helper"

RSpec.describe "GET /api/v1/products/top_sellers", type: :request do
  # Build a paid/shipped order carrying { product => qty } so units actually
  # count toward the ranking. Pass the units hash explicitly (Ruby 3 would
  # otherwise treat `product => qty` pairs as keyword args), status: separately.
  def sold!(units_by_product, status: "paid")
    order = create(:order, status: status)
    units_by_product.each do |product, qty|
      OrderItem.create!(order: order, product: product, quantity: qty)
    end
    order
  end

  def ids(json)
    json.fetch("data").map { |p| p["id"] }
  end

  describe "ranking by units sold" do
    it "orders products by total quantity sold DESC" do
      low  = create(:product, name: "Low")
      mid  = create(:product, name: "Mid")
      high = create(:product, name: "High")

      sold!({ high => 5, mid => 3, low => 1 })
      sold!({ mid => 1 }) # high=5, mid=4, low=1

      get "/api/v1/products/top_sellers"
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      ranked = ids(body)
      # Sales-ranked ones come first, in sold order.
      expect(ranked.first(3)).to eq([ high.id, mid.id, low.id ])
    end

    it "only counts paid/shipped orders (ignores pending/cancelled)" do
      sells    = create(:product, name: "Sells")
      pending  = create(:product, name: "PendingOnly")

      sold!({ sells => 2 }, status: "paid")
      sold!({ pending => 99 }, status: "pending")
      sold!({ pending => 99 }, status: "cancelled")

      get "/api/v1/products/top_sellers"
      body = JSON.parse(response.body)
      ranked = ids(body)

      # Both appear (fallback fills), but the paid one must outrank the never-paid one.
      expect(ranked.index(sells.id)).to be < ranked.index(pending.id)
    end
  end

  describe "fallback (never empty)" do
    it "backfills with featured, then newest in-stock, when there are no sales" do
      featured = create(:product, name: "Featured", featured: true)
      newest   = create(:product, name: "Newest",   featured: false)

      get "/api/v1/products/top_sellers"
      body = JSON.parse(response.body)
      ranked = ids(body)

      expect(ranked).to include(featured.id, newest.id)
      # featured is preferred over plain newest in the backfill order
      expect(ranked.index(featured.id)).to be < ranked.index(newest.id)
    end

    it "returns results even with zero sales" do
      create_list(:product, 2)

      get "/api/v1/products/top_sellers"
      body = JSON.parse(response.body)

      expect(body["data"]).not_to be_empty
    end
  end

  describe "limit" do
    it "defaults to 8 and never exceeds it" do
      create_list(:product, 12)

      get "/api/v1/products/top_sellers"
      body = JSON.parse(response.body)

      expect(body["data"].size).to eq(8)
    end

    it "honours an explicit limit param" do
      create_list(:product, 12)

      get "/api/v1/products/top_sellers", params: { limit: 3 }
      body = JSON.parse(response.body)

      expect(body["data"].size).to eq(3)
    end

    it "clamps the limit to the 1..24 range" do
      create_list(:product, 30)

      get "/api/v1/products/top_sellers", params: { limit: 999 }
      expect(JSON.parse(response.body)["data"].size).to eq(24)

      get "/api/v1/products/top_sellers", params: { limit: 0 }
      expect(JSON.parse(response.body)["data"].size).to eq(1)
    end
  end

  describe "only active + in-stock products" do
    it "excludes inactive and out-of-stock products even if they sold" do
      inactive = create(:product, name: "Inactive", active: false)
      oos      = create(:product, name: "OutOfStock", stock_quantity: 0)
      live     = create(:product, name: "Live")

      sold!({ inactive => 10, oos => 10, live => 1 })

      get "/api/v1/products/top_sellers"
      ranked = ids(JSON.parse(response.body))

      expect(ranked).to include(live.id)
      expect(ranked).not_to include(inactive.id, oos.id)
    end
  end
end
