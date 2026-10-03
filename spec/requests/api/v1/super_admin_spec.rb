require "rails_helper"

RSpec.describe "Super admin console", type: :request do
  let!(:canada) { Franchise.default }
  let(:boss) { create(:user, email: "owner@baydspa.ca", role: :super_admin) }

  def token(u) = JWT.encode({ sub: u.id, exp: 1.day.from_now.to_i }, ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  def auth(u = boss) = { "Authorization" => "Bearer #{token(u)}" }
  def json = JSON.parse(response.body)

  it "is for super admins only" do
    admin = create(:user, email: "admin@baydspa.ca", role: :admin, franchise: canada)
    get "/api/v1/super/franchises", headers: auth(admin)
    expect(response).to have_http_status(:forbidden)
  end

  it "sets up a new country from data alone, then takes it live" do
    post "/api/v1/super/franchises", headers: auth, as: :json, params: {
      franchise: { name: "B.A.Y.D UK", slug: "uk", country_code: "gb", currency: "gbp", locale: "en-GB",
                   time_zone: "Europe/London", tax_name: "VAT", tax_rate: 0.2, staff_email_domain: "bayd.co.uk",
                   subdomain: "uk", royalty_pct: 8 }
    }
    expect(response).to have_http_status(:created)
    expect(json).to include("status" => "draft", "country_code" => "GB", "currency" => "GBP")
    uk = Franchise.find(json["id"])

    post "/api/v1/super/franchises/#{uk.id}/go_live", headers: auth
    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]).to include("admin", "payments", "services")

    post "/api/v1/super/franchises/#{uk.id}/credentials", headers: auth, as: :json,
         params: { provider: "square", values: { access_token: "uk-token-x", location_id: "LUK" } }
    expect(json.dig("credential_status", "square")).to include("access_token" => true, "location_id" => true)
    expect(response.body).not_to include("uk-token-x")

    Current.set(franchise: canada) { create(:service, name: "Manicure") }
    post "/api/v1/super/franchises/#{uk.id}/copy_catalog", headers: auth
    expect(json["copied"]).to eq(1)
    expect(Current.set(franchise: uk) { Service.pluck(:name) }).to eq([ "Manicure" ])

    expect {
      post "/api/v1/super/franchises/#{uk.id}/admins", headers: auth, as: :json,
           params: { email: "Run@Bayd.co.uk", first_name: "Rae" }
    }.to have_enqueued_mail(MagicLinkMailer, :franchise_admin_invite)
    expect(json["admins"].map { |a| a["email"] }).to eq([ "run@bayd.co.uk" ])
    expect(User.find_by(email: "run@bayd.co.uk")).to have_attributes(role: "admin", franchise_id: uk.id)

    Current.set(franchise: uk) { create(:employee_profile, user: create(:user, email: "tech@bayd.co.uk", role: :employee)) }
    patch "/api/v1/super/franchises/#{uk.id}", headers: auth, as: :json,
          params: { franchise: { privacy_body: "Privacy...", terms_body: "Terms..." } }

    post "/api/v1/super/franchises/#{uk.id}/go_live", headers: auth
    expect(response).to have_http_status(:ok)
    expect(json["status"]).to eq("live")

    get "/api/v1/franchise", headers: { "X-Franchise" => "uk" }
    expect(JSON.parse(response.body)).to include("slug" => "uk", "currency" => "GBP")
  end

  it "refuses an invite for an email that already has an account" do
    uk = create(:franchise, slug: "uk")
    create(:user, email: "taken@bayd.co.uk")
    post "/api/v1/super/franchises/#{uk.id}/admins", headers: auth, as: :json, params: { email: "taken@bayd.co.uk", first_name: "T" }
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "takes admin access away" do
    uk = create(:franchise, slug: "uk")
    admin = create(:user, email: "a@bayd.co.uk", role: :admin, franchise: uk)
    delete "/api/v1/super/franchises/#{uk.id}/admins/#{admin.id}", headers: auth
    expect(admin.reload.role).to eq("customer")
    get "/api/v1/admin/bookings", headers: auth(admin)
    expect(response).to have_http_status(:forbidden)
  end

  it "tests a franchise's payment keys inside that franchise" do
    uk = create(:franchise, slug: "uk")
    seen = nil
    allow(SquareService).to receive(:test_connection) { seen = Current.franchise and { ok: true, message: "Connected to Square (UK)." } }
    post "/api/v1/super/franchises/#{uk.id}/test_payments", headers: auth
    expect(json).to eq("ok" => true, "message" => "Connected to Square (UK).")
    expect(seen).to eq(uk)
  end

  it "won't suspend the default franchise" do
    post "/api/v1/super/franchises/#{canada.id}/suspend", headers: auth
    expect(response).to have_http_status(:unprocessable_content)
  end

  describe "analytics and royalties" do
    let!(:uk) { create(:franchise, slug: "uk", royalty_pct: 10) }

    before do
      Current.set(franchise: uk) do
        booking = create(:booking, status: "completed", total: 200, starts_at: 2.days.ago, ends_at: 2.days.ago + 1.hour)
        booking.payments.create!(amount: 200, status: "paid", method: "card", paid_at: 2.days.ago)
      end
    end

    it "shows each franchise in its own currency" do
      get "/api/v1/super/analytics", headers: auth, params: { month: 2.days.ago.strftime("%Y-%m") }
      row = json["franchises"].find { |f| f["slug"] == "uk" }
      expect(row).to include("currency" => "GBP", "bookings" => 1, "completed" => 1)
      expect(row["received"].to_d).to eq(200)
      expect(row["royalty_estimate"].to_d).to eq(20)
      expect(json["franchises"].find { |f| f["slug"] == "canada" }["bookings"]).to eq(0)
    end

    it "builds a monthly statement, marks it paid, and shows it to that franchise's admin only" do
      post "/api/v1/super/franchises/#{uk.id}/royalty_statements", headers: auth, params: { month: 2.days.ago.strftime("%Y-%m") }
      expect(json).to include("currency" => "GBP", "status" => "open")
      expect(json["royalty_due"].to_d).to eq(20)

      post "/api/v1/super/royalty_statements/#{json['id']}/mark_paid", headers: auth
      expect(json["status"]).to eq("paid")

      uk_admin = create(:user, email: "a@bayd.co.uk", role: :admin, franchise: uk)
      get "/api/v1/admin/royalty_statements", headers: auth(uk_admin)
      expect(json.size).to eq(1)
      ca_admin = create(:user, email: "a@baydspa.ca", role: :admin, franchise: canada)
      get "/api/v1/admin/royalty_statements", headers: auth(ca_admin)
      expect(json).to eq([])
    end

    it "runs every month for live franchises" do
      MonthlyRoyaltyJob.perform_now(2.days.ago.to_date)
      expect(RoyaltyStatement.where(franchise: uk).count).to eq(1)
    end
  end
end
