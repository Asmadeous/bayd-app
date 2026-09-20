require "rails_helper"

# The tech self-reports a booking they failed to attend (missed). Distinct from
# no_show (client fault, charged): missed never charges the client and offers a
# reschedule.
RSpec.describe "Employee mark booking missed", type: :request do
  let(:tech_user)  { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)   { create(:employee_profile, user: tech_user) }
  let(:other_tech) { create(:employee_profile, user: create(:user, email: "other@baydspa.ca", role: :employee)) }
  let(:customer)   { create(:user) }
  let(:service)    { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(employee: profile, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: employee,
                    starts_at: 5.minutes.ago, ends_at: 55.minutes.from_now, status: status,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  it "marks the tech's own booking missed and returns the serialized booking" do
    b = booking
    post "/api/v1/employee/bookings/#{b.id}/missed", headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["status"]).to eq("missed")
    expect(b.reload.missed?).to be(true)
  end

  it "notifies the customer with a reschedule offer" do
    b = booking
    perform_enqueued_jobs do
      post "/api/v1/employee/bookings/#{b.id}/missed", headers: auth_header(tech_user), as: :json
    end
    expect(Notification.exists?(user: customer, booking: b, kind: "booking_missed")).to be(true)
  end

  it "never charges the customer for a missed booking" do
    b = booking
    expect {
      perform_enqueued_jobs do
        post "/api/v1/employee/bookings/#{b.id}/missed", headers: auth_header(tech_user), as: :json
      end
    }.not_to change(Payment, :count)
  end

  it "forbids marking another tech's booking (not found via profile scope)" do
    b = booking(employee: other_tech)
    post "/api/v1/employee/bookings/#{b.id}/missed", headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:not_found)
    expect(b.reload.confirmed?).to be(true)
  end

  it "rejects an already-completed booking with 422" do
    b = booking(status: "completed")
    post "/api/v1/employee/bookings/#{b.id}/missed", headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(b.reload.completed?).to be(true)
  end
end
