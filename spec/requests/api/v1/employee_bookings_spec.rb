require "rails_helper"

RSpec.describe "POST /api/v1/employee/bookings", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile) { create(:employee_profile, user: tech_user) }
  let(:service) { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def valid_params(overrides = {})
    {
      service_id: service.id,
      starts_at: (Time.current + 2.days).change(hour: 11).iso8601,
      customer: { email: "client@example.com", first_name: "Sam", phone: "+15551234567" },
      address: { line1: "1 Front St W", city: "Toronto", province: "ON", postal_code: "M5J 2X5" }
    }.merge(overrides)
  end

  it "creates a confirmed booking for the acting tech (no eligibility gates)" do
    expect {
      post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(tech_user), as: :json
    }.to change(Booking, :count).by(1)

    expect(response).to have_http_status(:created)
    booking = Booking.last
    expect(booking.employee_profile).to eq(profile)
    expect(booking.status).to eq("confirmed")
    expect(booking.user.email).to eq("client@example.com")
    expect(booking.ends_at - booking.starts_at).to eq(60.minutes)
  end

  it "force-books even when the tech is off-shift and outside operating hours" do
    profile.update!(on_shift: false)
    params = valid_params(starts_at: (Time.current + 2.days).change(hour: 3).iso8601) # 3am, outside hours

    post "/api/v1/employee/bookings", params: params, headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:created)
  end

  it "rejects a double-booking on the same tech at the same time (DB guard)" do
    post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:created)

    post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:conflict)
  end

  it "requires employee/admin auth" do
    customer = create(:user, role: :customer)
    post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(customer), as: :json
    expect(response).to have_http_status(:forbidden)
  end

  it "422s on an invalid start time" do
    post "/api/v1/employee/bookings", params: valid_params(starts_at: "nope"),
         headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "geocodes the typed address so the booking has coordinates to navigate to" do
    # Address auto-geocodes on save; stub the lookup Geocoder does for a fresh row.
    allow_any_instance_of(Address).to receive(:geocode) do |addr|
      addr.latitude = 43.65
      addr.longitude = -79.38
    end
    post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:created)
    b = Booking.last
    expect(b.service_latitude.to_f).to eq(43.65)
    expect(b.service_longitude.to_f).to eq(-79.38)
  end

  it "rejects the booking when the address can't be geocoded (no coordless booking)" do
    allow_any_instance_of(Address).to receive(:geocode) # no-op → lat/lng stay nil
    expect {
      post "/api/v1/employee/bookings", params: valid_params, headers: auth_header(tech_user), as: :json
    }.not_to change(Booking, :count)
    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to match(/locate that address/)
  end

  describe "add-ons (extra services the same tech performs this visit)" do
    # The primary + the add-on share a non-lashes category so they're combinable,
    # and the tech performs BOTH (employee_services).
    let(:category) { service.service_category }
    let(:addon) { create(:service, service_category: category, duration_minutes: 30, price: 40) }

    before do
      profile.services << service << addon
    end

    it "folds a performed add-on's price and duration into the one booking" do
      post "/api/v1/employee/bookings",
           params: valid_params(addon_service_ids: [ addon.id ]),
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:created)

      booking = Booking.last
      expect(booking.total.to_f).to eq(120.0)                 # 80 primary + 40 add-on
      expect(booking.ends_at - booking.starts_at).to eq(90.minutes) # 60 + 30
      expect(booking.raw["addons"].map { |a| a["id"] }).to eq([ addon.id ])
      expect(JSON.parse(response.body)["addons"].size).to eq(1)
    end

    it "skips (and reports) an add-on the tech doesn't perform; the visit still books" do
      other = create(:service, service_category: category, price: 25) # tech does NOT perform this

      post "/api/v1/employee/bookings",
           params: valid_params(addon_service_ids: [ other.id ]),
           headers: auth_header(tech_user), as: :json
      expect(response).to have_http_status(:created)

      booking = Booking.last
      expect(booking.total.to_f).to eq(80.0)  # unchanged - add-on not applied
      body = JSON.parse(response.body)
      expect(body["addons"]).to be_empty
      expect(body["addon_failures"].first["service_id"]).to eq(other.id)
    end
  end
end
