require "rails_helper"

RSpec.describe "Franchise resolution", type: :request do
  let!(:canada) { Franchise.default }
  let!(:uk) { create(:franchise, slug: "uk", subdomain: "uk") }

  def token(u) = JWT.encode({ sub: u.id, exp: 1.day.from_now.to_i }, ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  def auth(u) = { "Authorization" => "Bearer #{token(u)}" }
  def slug(headers = {}) = (get("/api/v1/franchise", headers: headers) && JSON.parse(response.body)["slug"])

  it "defaults to Canada when nothing says otherwise" do
    expect(slug).to eq("canada")
  end

  it "uses X-Franchise for visitors and customers" do
    expect(slug("X-Franchise" => "uk")).to eq("uk")
    expect(slug("X-Franchise" => "uk").then { slug(auth(create(:user)).merge("X-Franchise" => "uk")) }).to eq("uk")
  end

  it "uses the site the request comes from" do
    expect(slug("Origin" => "https://uk.baydspa.ca")).to eq("uk")
    expect(slug("Origin" => "https://baydspa.ca")).to eq("canada")
  end

  it "never sends visitors to a draft franchise" do
    uk.update!(status: "draft")
    expect(slug("X-Franchise" => "uk")).to eq("canada")
  end

  it "keeps staff in their own franchise whatever they ask for" do
    admin = create(:user, email: "boss@bayd.co.uk", role: :admin, franchise: uk)
    expect(slug(auth(admin).merge("X-Franchise" => "canada"))).to eq("uk")
  end

  it "lets a super admin pick any franchise, even a draft" do
    boss = create(:user, email: "owner@baydspa.ca", role: :super_admin)
    uk.update!(status: "draft")
    expect(slug(auth(boss).merge("X-Franchise" => "uk"))).to eq("uk")
  end

  it "treats a super admin as an admin" do
    expect(build(:user, role: :super_admin).admin?).to be(true)
    expect(User.admin.to_sql).to include("'admin'")
  end

  it "shows only public config" do
    uk.update!(gateway_credentials: "secret-ish")
    get "/api/v1/franchise", headers: { "X-Franchise" => "uk" }
    body = JSON.parse(response.body)
    expect(body).to include("currency" => "GBP", "time_zone" => "Europe/London", "tax_name" => "VAT",
                            "staff_email_domain" => "bayd.co.uk")
    expect(body.keys).not_to include("gateway_credentials", "royalty_pct")
  end
end

RSpec.describe "CORS for franchise sites", type: :request do
  it "allows a live franchise's own site and not a draft's" do
    create(:franchise, slug: "uk", subdomain: "uk", custom_domain: "baydspa.co.uk")
    create(:franchise, slug: "fr", subdomain: "fr", status: "draft")

    get "/api/v1/franchise", headers: { "Origin" => "https://baydspa.co.uk" }
    expect(response.headers["Access-Control-Allow-Origin"]).to eq("https://baydspa.co.uk")

    get "/api/v1/franchise", headers: { "Origin" => "https://uk.baydspa.ca" }
    expect(response.headers["Access-Control-Allow-Origin"]).to eq("https://uk.baydspa.ca")

    get "/api/v1/franchise", headers: { "Origin" => "https://fr.baydspa.ca" }
    expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
  end
end

RSpec.describe "GET /api/v1/franchise/resolve", type: :request do
  let!(:canada) { Franchise.default }
  let!(:uk) { create(:franchise, slug: "uk") }

  it "finds the franchise whose technicians cover the address" do
    Current.set(franchise: uk) { create(:employee_profile, service_fsas: [ "SW1A" ]) }
    Current.set(franchise: canada) { create(:employee_profile, service_fsas: [ "M5V" ]) }

    get "/api/v1/franchise/resolve", params: { country_code: "GB", postal_code: "SW1A 2AA" }
    expect(JSON.parse(response.body)["slug"]).to eq("uk")

    get "/api/v1/franchise/resolve", params: { country_code: "CA", postal_code: "M5V 2T6" }
    expect(JSON.parse(response.body)["slug"]).to eq("canada")

    get "/api/v1/franchise/resolve", params: { country_code: "GB", postal_code: "E14 5AB" }
    expect(JSON.parse(response.body)["slug"]).to eq("uk") # that country's franchise, even if not covered yet
  end
end

RSpec.describe "Public franchise list and legal text", type: :request do
  it "lists only live franchises and serves each one's legal text" do
    Franchise.default
    create(:franchise, slug: "uk", name: "B.A.Y.D UK", privacy_body: "UK privacy", terms_body: "UK terms")
    create(:franchise, slug: "fr", status: "draft")

    get "/api/v1/franchises"
    expect(JSON.parse(response.body).map { |f| f["slug"] }).to eq(%w[canada uk])

    get "/api/v1/franchise/legal", headers: { "X-Franchise" => "uk" }
    expect(JSON.parse(response.body)).to include("privacy_body" => "UK privacy", "terms_body" => "UK terms")
  end
end
