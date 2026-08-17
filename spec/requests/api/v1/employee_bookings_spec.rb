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
end
