require "rails_helper"

# The staff schedule endpoint: active jobs by default, and job HISTORY
# (completed / cancelled / no-show) via ?filter=past so techs can review
# previous bookings.
RSpec.describe "GET /api/v1/employee/schedule", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(status:, starts_at:)
    Booking.create!(user: customer, service: service, employee_profile: profile,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: status,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  let!(:upcoming)  { booking(status: "confirmed", starts_at: 2.days.from_now) }
  let!(:completed) { booking(status: "completed", starts_at: 3.days.ago) }
  let!(:cancelled) { booking(status: "cancelled", starts_at: 5.days.ago) }

  it "returns only active bookings by default" do
    get "/api/v1/employee/schedule", headers: auth_header(tech_user)
    expect(response).to have_http_status(:ok)
    ids = JSON.parse(response.body)["data"].map { |b| b["id"] }
    expect(ids).to include(upcoming.id)
    expect(ids).not_to include(completed.id, cancelled.id)
  end

  it "returns past bookings (completed/cancelled/no-show) with filter=past, newest first" do
    get "/api/v1/employee/schedule", params: { filter: "past" }, headers: auth_header(tech_user)
    expect(response).to have_http_status(:ok)
    ids = JSON.parse(response.body)["data"].map { |b| b["id"] }
    expect(ids).to include(completed.id, cancelled.id)
    expect(ids).not_to include(upcoming.id)
    # newest first: completed (3 days ago) before cancelled (5 days ago)
    expect(ids.index(completed.id)).to be < ids.index(cancelled.id)
  end

  describe "GET /api/v1/employee/bookings/:id (single, for navigate/call screens)" do
    it "returns the tech's own booking with its coordinates" do
      b = booking(status: "confirmed", starts_at: 1.day.from_now)
      b.update!(service_latitude: 43.65, service_longitude: -79.38)
      get "/api/v1/employee/bookings/#{b.id}", headers: auth_header(tech_user)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["id"]).to eq(b.id)
      expect(body["service_latitude"].to_f).to eq(43.65)
    end

    it "404s for a booking that isn't the acting tech's" do
      other_tech = create(:employee_profile)
      others = Booking.create!(user: customer, service: service, employee_profile: other_tech,
                               starts_at: 1.day.from_now, ends_at: 1.day.from_now + 1.hour, status: "confirmed",
                               subtotal: 80, travel_fee: 0, total: 80)
      get "/api/v1/employee/bookings/#{others.id}", headers: auth_header(tech_user)
      expect(response).to have_http_status(:not_found)
    end
  end
end
