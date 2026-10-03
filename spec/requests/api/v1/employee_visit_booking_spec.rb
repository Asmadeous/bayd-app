require "rails_helper"

RSpec.describe "POST /api/v1/employee/bookings with several services", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee, first_name: "Dana") }
  let!(:profile) { create(:employee_profile, user: tech_user) }
  let(:manicure) { create(:service, name: "Manicure", duration_minutes: 30, price: 40) }
  let(:pedicure) { create(:service, name: "Pedicure", duration_minutes: 60, price: 50) }
  let(:start) { (Time.current + 2.days).change(hour: 11) }

  before { allow_any_instance_of(Address).to receive(:geocode) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def params(overrides = {})
    {
      service_ids: [ manicure.id, pedicure.id ],
      starts_at: start.iso8601,
      customer: { email: "client@example.com", first_name: "Sam", phone: "+15551234567" },
      address: { line1: "1 Front St W", city: "Toronto", province: "ON", postal_code: "M5J 2X5", latitude: 43.64, longitude: -79.38 }
    }.merge(overrides)
  end

  it "books every service as its own line on the tech's schedule, back-to-back" do
    post "/api/v1/employee/bookings", params: params, headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:created)
    visit = Visit.find(JSON.parse(response.body)["visit_id"])
    expect(visit.bookings.map { |b| [ b.service, b.employee_profile, b.status, b.total.to_i ] })
      .to eq([ [ manicure, profile, "confirmed", 40 ], [ pedicure, profile, "confirmed", 50 ] ])
    expect(visit.bookings.first.ends_at).to eq(visit.bookings.last.starts_at)
    expect(visit.ends_at).to eq(visit.bookings.last.ends_at)
  end

  it "refuses a clash with the tech's other bookings" do
    create(:booking, employee_profile: profile, starts_at: start + 45.minutes, ends_at: start + 2.hours)
    post "/api/v1/employee/bookings", params: params, headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:conflict)
    expect(Visit.count).to eq(0)
  end

  it "rejects unknown services" do
    post "/api/v1/employee/bookings", params: params(service_ids: [ 999_999 ]), headers: auth_header(tech_user), as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
end
