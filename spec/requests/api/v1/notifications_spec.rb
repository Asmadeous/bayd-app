require "rails_helper"

# The apps open a notification's booking when it's tapped, so the list carries
# booking_id.
RSpec.describe "GET /api/v1/notifications", type: :request do
  let(:customer) { create(:user) }
  let(:tech_user) { create(:user, email: "tech.notes@baydspa.ca", role: :employee) }
  let(:booking) do
    Booking.create!(user: customer, service: create(:service), employee_profile: create(:employee_profile, user: tech_user),
                    starts_at: 1.day.from_now, ends_at: 1.day.from_now + 1.hour, status: "confirmed",
                    subtotal: 50, travel_fee: 0, total: 50)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "includes the booking each notification is about" do
    tech_user.notifications.create!(kind: "booking_reminder_day_of", title: "Starts soon", booking: booking)
    tech_user.notifications.create!(kind: "review_request", title: "Rate us")

    get "/api/v1/notifications", headers: auth_header(tech_user)

    data = JSON.parse(response.body)["data"]
    expect(response).to have_http_status(:ok)
    expect(data.map { |n| n["booking_id"] }).to contain_exactly(booking.id, nil)
  end
end
