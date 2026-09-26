require "rails_helper"

# Paging behind the apps' "Load more": the lists must page without hiding
# anything (an upcoming booking, the newest chat messages).
RSpec.describe "App list paging", type: :request do
  let(:customer) { create(:user, email: "client@example.com") }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60, price: 50) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def json = JSON.parse(response.body)

  def book(at, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: tech, starts_at: at, ends_at: at + 1.hour,
                    status: status, subtotal: 50, travel_fee: 0, total: 50)
  end

  describe "GET /bookings?when=" do
    it "splits upcoming (soonest first) from past (latest first), a page at a time" do
      30.times { |i| book((i + 1).days.ago, status: "completed") }
      soon = book(2.days.from_now)
      later = book(9.days.from_now)
      cancelled_future = book(5.days.from_now, status: "cancelled")

      get "/api/v1/bookings", params: { when: "upcoming" }, headers: auth_header(customer)
      expect(json["data"].map { |b| b["id"] }).to eq([ soon.id, later.id ])

      get "/api/v1/bookings", params: { when: "past" }, headers: auth_header(customer)
      expect(json["data"].size).to eq(25)
      expect(json["data"].first["id"]).to eq(cancelled_future.id)
      expect(json["pagination"]["next_page"]).to eq(2)

      get "/api/v1/bookings", params: { when: "past", page: 2 }, headers: auth_header(customer)
      expect(json["data"].size).to eq(6)
    end
  end

  describe "GET /conversations/:id/messages?latest=1" do
    it "opens on the newest messages and pages back in time, each page in reading order" do
      convo = Conversation.between(customer, tech.user)
      30.times { |i| convo.messages.create!(sender: customer, body: "m#{i}", created_at: (30 - i).minutes.ago) }

      get "/api/v1/conversations/#{convo.id}/messages", params: { latest: 1 }, headers: auth_header(customer)
      bodies = json["data"].map { |m| m["body"] }
      expect(bodies.first).to eq("m5")
      expect(bodies.last).to eq("m29")

      get "/api/v1/conversations/#{convo.id}/messages", params: { latest: 1, page: 2 }, headers: auth_header(customer)
      expect(json["data"].map { |m| m["body"] }).to eq(%w[m0 m1 m2 m3 m4])
    end
  end

  describe "GET /conversations" do
    it "pages when asked and returns everything otherwise" do
      27.times { Conversation.between(customer, create(:user)) }

      get "/api/v1/conversations", params: { page: 1 }, headers: auth_header(customer)
      expect(json["data"].size).to eq(25)
      expect(json["pagination"]["total_count"]).to eq(27)

      get "/api/v1/conversations", headers: auth_header(customer)
      expect(json.size).to eq(27)
    end
  end

  describe "GET /conversations/:id" do
    it "returns your own conversation and 404s anyone else's" do
      mine = Conversation.between(customer, tech.user)
      theirs = Conversation.between(create(:user), create(:user))

      get "/api/v1/conversations/#{mine.id}", headers: auth_header(customer)
      expect(response).to have_http_status(:ok)
      expect(json["id"]).to eq(mine.id)

      get "/api/v1/conversations/#{theirs.id}", headers: auth_header(customer)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /loyalty/transactions" do
    it "pages the points history, newest first" do
      account = customer.loyalty_account || customer.create_loyalty_account!
      26.times { |i| account.earn!(i + 1, description: "visit #{i}") }

      get "/api/v1/loyalty/transactions", headers: auth_header(customer)
      expect(json["data"].size).to eq(25)
      expect(json["data"].first["points"]).to eq(26)
      expect(json["pagination"]["next_page"]).to eq(2)
    end
  end

  describe "GET /support/threads/:token?page=" do
    it "returns the latest page of the thread in reading order" do
      thread = SupportThread.create!(name: "Guest", email: "guest@example.com")
      30.times { |i| thread.messages.create!(body: "s#{i}", from_staff: false, created_at: (30 - i).minutes.ago) }

      get "/api/v1/support/threads/#{thread.token}", params: { page: 1 }
      expect(json["messages"].first["body"]).to eq("s5")
      expect(json["messages"].last["body"]).to eq("s29")
      expect(json["pagination"]["next_page"]).to eq(2)

      get "/api/v1/support/threads/#{thread.token}"
      expect(json["messages"].size).to eq(30)
    end
  end

  describe "GET /employee/reviews" do
    it "averages every review, not just the page" do
      tech_user = create(:user, email: "staff@baydspa.ca", role: :employee)
      staff = create(:employee_profile, user: tech_user)
      30.times do |i|
        b = Booking.create!(user: customer, service: service, employee_profile: staff, starts_at: (i + 1).days.ago,
                            ends_at: (i + 1).days.ago + 1.hour, status: "completed", subtotal: 50, travel_fee: 0, total: 50)
        Review.create!(booking: b, user: customer, employee_profile: staff, rating: i < 25 ? 5 : 1)
      end

      get "/api/v1/employee/reviews", headers: auth_header(tech_user)
      expect(json["data"].size).to eq(25)
      expect(json["average_rating"].to_f).to eq(4.3)
    end
  end

  describe "GET /product_categories" do
    it "counts the products on sale in each category, subcategories included" do
      parent = ProductCategory.create!(name: "Fragrances", slug: "fragrances", active: true)
      child = ProductCategory.create!(name: "Perfume", slug: "perfume", parent: parent, active: true)
      create(:product, product_category: parent, active: true, stock_quantity: 3)
      create(:product, product_category: child, active: true, stock_quantity: 1)
      create(:product, product_category: child, active: true, stock_quantity: 0)

      get "/api/v1/product_categories"
      expect(json.find { |c| c["name"] == "Fragrances" }["product_count"]).to eq(2)
    end
  end
end
