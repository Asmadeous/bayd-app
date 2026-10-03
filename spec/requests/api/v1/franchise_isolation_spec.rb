require "rails_helper"

# Two franchises side by side: nobody below a super admin ever sees or touches
# the other franchise's data.
RSpec.describe "Franchise isolation", type: :request do
  let!(:canada) { Franchise.default }
  let!(:uk) { create(:franchise, slug: "uk") }

  def token(u) = JWT.encode({ sub: u.id, exp: 1.day.from_now.to_i }, ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  def auth(u, extra = {}) = { "Authorization" => "Bearer #{token(u)}" }.merge(extra)
  def json = JSON.parse(response.body)

  # Everything below is created inside its franchise, the way requests do it.
  def in_franchise(franchise, &) = Current.set(franchise: franchise, &)

  let!(:ca_world) { in_franchise(canada) { world("ca", "baydspa.ca") } }
  let!(:uk_world) { in_franchise(uk) { world("uk", "bayd.co.uk") } }

  def world(tag, domain)
    service = create(:service, name: "#{tag} manicure")
    tech_user = create(:user, email: "tech-#{tag}@#{domain}", role: :employee, first_name: "Tech#{tag}")
    tech = create(:employee_profile, user: tech_user)
    customer = create(:user, email: "cust-#{tag}@example.com")
    booking = create(:booking, user: customer, employee_profile: tech, service: service)
    admin = create(:user, email: "admin@#{domain}", role: :admin)
    { service: service, tech: tech, tech_user: tech_user, customer: customer, booking: booking, admin: admin }
  end

  it "puts every record in the franchise it was created in" do
    expect(uk_world[:booking].franchise).to eq(uk)
    expect(uk_world[:tech_user].franchise).to eq(uk)
    expect(ca_world[:service].franchise).to eq(canada)
  end

  it "shows visitors only the franchise's own services" do
    get "/api/v1/services", headers: { "X-Franchise" => "uk" }
    expect(json.map { |s| s["name"] }).to eq([ "uk manicure" ])
    get "/api/v1/services"
    expect(json.map { |s| s["name"] }).to eq([ "ca manicure" ])
  end

  it "keeps a franchise admin inside their franchise" do
    admin = uk_world[:admin]
    get "/api/v1/admin/bookings", headers: auth(admin)
    expect(json["data"].map { |b| b["id"] }).to eq([ uk_world[:booking].id ])

    get "/api/v1/admin/bookings/#{ca_world[:booking].id}", headers: auth(admin)
    expect(response).to have_http_status(:not_found)

    patch "/api/v1/admin/bookings/#{ca_world[:booking].id}", params: { status: "cancelled" }, headers: auth(admin)
    expect(response).to have_http_status(:not_found)
    expect(ca_world[:booking].reload.status).to eq("confirmed")

    get "/api/v1/admin/employees", headers: auth(admin)
    expect(json["data"].map { |e| e["id"] }).to eq([ uk_world[:tech].id ])

    get "/api/v1/admin/users", headers: auth(admin)
    emails = json["data"].map { |u| u["email"] }
    expect(emails).to include("cust-uk@example.com", "tech-uk@bayd.co.uk")
    expect(emails).not_to include("cust-ca@example.com", "tech-ca@baydspa.ca", "admin@baydspa.ca")
  end

  it "ignores a franchise admin asking for another franchise" do
    get "/api/v1/admin/bookings", headers: auth(uk_world[:admin], "X-Franchise" => "canada")
    expect(json["data"].map { |b| b["id"] }).to eq([ uk_world[:booking].id ])
  end

  it "won't let a franchise admin make a super admin" do
    patch "/api/v1/admin/users/#{uk_world[:customer].id}", params: { role: "super_admin" }, headers: auth(uk_world[:admin])
    expect(response).to have_http_status(:forbidden)
  end

  it "keeps staff to their own jobs" do
    get "/api/v1/employee/bookings/#{ca_world[:booking].id}", headers: auth(uk_world[:tech_user])
    expect(response).to have_http_status(:not_found)
  end

  it "gives a super admin every franchise, or one they pick" do
    boss = create(:user, email: "owner@baydspa.ca", role: :super_admin)
    get "/api/v1/admin/bookings", headers: auth(boss)
    expect(json["data"].map { |b| b["id"] }).to contain_exactly(ca_world[:booking].id, uk_world[:booking].id)

    get "/api/v1/admin/bookings", headers: auth(boss, "X-Franchise" => "uk")
    expect(json["data"].map { |b| b["id"] }).to eq([ uk_world[:booking].id ])
  end

  it "only tells a franchise's own admins about its events" do
    expect(User.franchise_admins(uk)).to eq([ uk_world[:admin] ])
  end

  it "runs a job in the franchise it was queued from" do
    seen = nil
    stub_const("ProbeJob", Class.new(ApplicationJob) { define_method(:perform) { seen = Current.franchise } })
    in_franchise(uk) { ProbeJob.perform_later }
    perform_enqueued_jobs
    expect(seen).to eq(uk)
  end
end
