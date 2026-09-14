require "rails_helper"

# Square Tap to Pay (in-person POS): the native SDK takes the tap on-device and
# returns a completed Square payment id. This endpoint RECORDS it against the
# booking after verifying it with Square. It never charges. Gated behind clock-in.
RSpec.describe "POST /api/v1/employee/bookings/:id/pos_payment", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(status: "in_progress")
    Booking.create!(user: customer, service: service, employee_profile: profile,
                    starts_at: 5.minutes.ago, ends_at: 55.minutes.from_now, status: status,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  # A cleared Square payment for $80.00 (8000 cents).
  def square_payment(status: "COMPLETED", cents: 8000)
    { "id" => "sq_pay_123", "status" => status, "amount_money" => { "amount" => cents, "currency" => "CAD" } }
  end

  it "records a verified in-person payment and marks the booking paid" do
    b = booking
    allow(SquareService).to receive(:get_payment).with("sq_pay_123").and_return(square_payment)

    post "/api/v1/employee/bookings/#{b.id}/pos_payment",
         params: { square_payment_id: "sq_pay_123", amount: 80 },
         headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:ok)
    expect(b.reload.payment_status).to eq("paid")
    expect(b.payments.where(status: "paid", processor: "square_pos").sum(:amount)).to eq(80)
  end

  it "rejects a payment id Square can't verify (spoofed)" do
    b = booking
    allow(SquareService).to receive(:get_payment).and_return(nil)

    post "/api/v1/employee/bookings/#{b.id}/pos_payment",
         params: { square_payment_id: "fake", amount: 80 },
         headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(b.reload.payment_status).not_to eq("paid")
  end

  it "rejects when the verified amount doesn't match what's claimed" do
    b = booking
    allow(SquareService).to receive(:get_payment).and_return(square_payment(cents: 5000)) # $50, not $80

    post "/api/v1/employee/bookings/#{b.id}/pos_payment",
         params: { square_payment_id: "sq_pay_123", amount: 80 },
         headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:unprocessable_content)
  end

  it "refuses to record a charge before clock-in (booking still confirmed)" do
    b = booking(status: "confirmed")
    allow(SquareService).to receive(:get_payment).and_return(square_payment)

    post "/api/v1/employee/bookings/#{b.id}/pos_payment",
         params: { square_payment_id: "sq_pay_123", amount: 80 },
         headers: auth_header(tech_user), as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(JSON.parse(response.body)["error"]).to match(/Clock in/)
  end
end
