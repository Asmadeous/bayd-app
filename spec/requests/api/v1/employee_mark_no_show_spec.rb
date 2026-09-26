require "rails_helper"

# The tech marks a client no-show (client wasn't there). It charges the client a
# fee, so it's refused before the appointment's time.
RSpec.describe "Employee mark booking no-show", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(starts_at:)
    Booking.create!(user: customer, service: service, employee_profile: profile, starts_at: starts_at,
                    ends_at: starts_at + 1.hour, status: "confirmed", subtotal: 80, travel_fee: 0, total: 80)
  end

  it "marks the client a no-show once the appointment time has started" do
    b = booking(starts_at: 10.minutes.ago)
    post "/api/v1/employee/bookings/#{b.id}/no_show", headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:ok)
    expect(b.reload.status).to eq("no_show")
  end

  it "refuses before the appointment time, so no fee is charged early" do
    b = booking(starts_at: 20.minutes.from_now)
    post "/api/v1/employee/bookings/#{b.id}/no_show", headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to match(/once the appointment time has started/)
    expect(b.reload.status).to eq("confirmed")
  end
end
