require "rails_helper"

# A tech records a payment collected in person without a card (cash, Interac
# e-Transfer, cheque). It is marked paid with the method used; card payments go
# through the hosted checkout instead.
RSpec.describe "POST /api/v1/employee/bookings/:id/record_payment", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 80) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def booking(status: "completed", owner: profile)
    Booking.create!(user: customer, service: service, employee_profile: owner,
                    starts_at: 2.hours.ago, ends_at: 1.hour.ago, status: status,
                    subtotal: 80, travel_fee: 0, total: 80)
  end

  def record(b, **params)
    post "/api/v1/employee/bookings/#{b.id}/record_payment",
         params: params, headers: auth_header(tech_user), as: :json
  end

  %w[cash interac cheque].each do |method|
    it "marks the booking paid by #{method} and reports the method" do
      b = booking
      record(b, method: method)

      expect(response).to have_http_status(:ok)
      expect(b.reload.payment_status).to eq("paid")
      expect(b.payments.find_by(status: "paid").method).to eq(method)
      expect(response.parsed_body["paid_methods"]).to eq([ method ])
    end
  end

  it "records a partial amount and leaves the rest outstanding" do
    b = booking
    record(b, method: "cash", amount: 30)

    expect(response).to have_http_status(:ok)
    expect(b.reload.outstanding_balance).to eq(50)
  end

  it "rejects card (that goes through the hosted checkout)" do
    record(booking, method: "card")
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "rejects more than is due" do
    record(booking, method: "cash", amount: 81)
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "rejects an already-paid booking" do
    b = booking
    record(b, method: "cash")
    record(b, method: "cash")
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "rejects before the tech has clocked in" do
    record(booking(status: "confirmed"), method: "cash")
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "cannot touch another tech's booking" do
    other = create(:employee_profile)
    record(booking(owner: other), method: "cash")
    expect(response).to have_http_status(:not_found)
  end
end
