require "rails_helper"

# Customer self-cancel: only pending/confirmed bookings, and only up to 24h
# before the start. Refunds are handled by an admin (no auto money movement).
RSpec.describe "Customer booking cancel", type: :request do
  let(:customer) { create(:user) }
  let(:service)  { create(:service, duration_minutes: 60, price: 80) }
  let(:tech)     { create(:employee_profile) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(status: "confirmed", starts_at: 3.days.from_now)
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 1.hour, status: status,
                    subtotal: 80, travel_fee: 0, total: 80, client_type: "adult", party_size: 1)
  end

  it "cancels a confirmed booking more than 24h away" do
    b = booking(starts_at: 3.days.from_now)
    post "/api/v1/bookings/#{b.id}/cancel", params: { reason: "changed plans" }, headers: auth_header(customer), as: :json

    expect(response).to have_http_status(:ok)
    expect(b.reload.status).to eq("cancelled")
    expect(b.cancellation_reason).to eq("changed plans")
  end

  it "refuses to cancel within 24h of the start (must call)" do
    b = booking(starts_at: 12.hours.from_now)
    post "/api/v1/bookings/#{b.id}/cancel", headers: auth_header(customer), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(b.reload.status).to eq("confirmed")
  end

  it "refuses to cancel an in-progress booking" do
    b = booking(status: "in_progress", starts_at: 3.days.from_now)
    post "/api/v1/bookings/#{b.id}/cancel", headers: auth_header(customer), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(b.reload.status).to eq("in_progress")
  end

  it "refuses to cancel another customer's booking (scoped)" do
    other = create(:user)
    b = booking
    post "/api/v1/bookings/#{b.id}/cancel", headers: auth_header(other), as: :json

    expect(response).to have_http_status(:not_found)
    expect(b.reload.status).to eq("confirmed")
  end
end
