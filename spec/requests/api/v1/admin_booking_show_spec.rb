require "rails_helper"

RSpec.describe "Admin booking detail + no hard delete", type: :request do
  let(:admin)   { create(:user, role: :admin) }
  let(:service) { create(:service, duration_minutes: 60, price: 80) }
  let(:booking) do
    Booking.create!(user: create(:user), employee_profile: create(:employee_profile), service: service,
                    status: "confirmed", starts_at: 2.days.from_now, ends_at: 2.days.from_now + 1.hour,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "returns one booking in the full view" do
    get "/api/v1/admin/bookings/#{booking.id}", headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("id" => booking.id)
    expect(response.parsed_body).to have_key("financials")
  end

  it "no longer lets an admin permanently delete a booking" do
    expect(Rails.application.routes.recognize_path("/api/v1/admin/bookings/#{booking.id}", method: :delete))
      .not_to include(action: "destroy")
  rescue ActionController::RoutingError
    expect(Booking.exists?(booking.id)).to be(true)
  end
end
