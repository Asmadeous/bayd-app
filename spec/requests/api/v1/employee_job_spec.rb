require "rails_helper"

# The staff Job screen: one of the tech's bookings with the client's name, how
# often they've been seen, and the clock record.
RSpec.describe "GET /api/v1/employee/bookings/:id", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:client)    { create(:user, first_name: "Joshie", last_name: "Kamau", phone: "+16475550199") }
  let(:service)   { create(:service, duration_minutes: 60, price: 50) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking_at(time, status:)
    Booking.create!(user: client, service: service, employee_profile: profile, starts_at: time, ends_at: time + 1.hour,
                    status: status, subtotal: 50, travel_fee: 0, total: 50)
  end

  it "includes the client's name, past visits and the clock record, but not their phone" do
    booking_at(10.days.ago, status: "completed")
    job = booking_at(2.hours.ago, status: "completed")
    profile.shifts.create!(status: "closed", booking: job, clock_in_at: 2.hours.ago, clock_out_at: 1.hour.ago,
                           distance_km: 4.2, clock_in_latitude: 43.65, clock_in_longitude: -79.38)

    get "/api/v1/employee/bookings/#{job.id}", headers: auth_header(tech_user)

    body = JSON.parse(response.body)
    expect(response).to have_http_status(:ok)
    expect(body["client"]).to eq("user_id" => client.id, "name" => "Joshie Kamau", "completed_visits" => 1)
    expect(body["visit"]["distance_km"].to_f).to eq(4.2)
    expect(body["visit"]["clock_out_at"]).to be_present
  end

  it "does not add client contact to the schedule list" do
    booking_at(1.day.from_now, status: "confirmed")
    get "/api/v1/employee/schedule", headers: auth_header(tech_user)
    expect(JSON.parse(response.body)["data"].first).not_to have_key("client")
  end
end
