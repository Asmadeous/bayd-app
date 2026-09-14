require "rails_helper"

# The tech's own earnings: card tips owed/paid, fuel reimbursement, and — for a
# partner provider — the partner payout at the platform-fee split.
RSpec.describe "GET /api/v1/employee/earnings", type: :request do
  let(:tech_user) { create(:user, email: "tech@baydspa.ca", role: :employee) }
  let!(:profile)  { create(:employee_profile, user: tech_user) }
  let(:customer)  { create(:user) }
  let(:service)   { create(:service, duration_minutes: 60, price: 100) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def paid_booking(total:)
    b = Booking.create!(user: customer, service: service, employee_profile: profile,
                        starts_at: 2.days.ago, ends_at: 2.days.ago + 1.hour, status: "completed",
                        subtotal: total, travel_fee: 0, total: total,
                        payment_status: "paid", partner_id: profile.partner_id)
    b.payments.create!(amount: total, status: "paid", method: "card", processor: "square", paid_at: Time.current)
    b
  end

  it "a direct (solo) tech sees tips + fuel, and NO partner block" do
    b = paid_booking(total: 100)
    Tip.create!(booking: b, employee_profile: profile, amount: 20, method: "card", status: "collected")
    profile.shifts.create!(status: "closed", clock_in_at: 2.days.ago, clock_out_at: 2.days.ago + 1.hour,
                           booking: b, fuel_reimbursement: 8.50, distance_km: 10,
                           clock_in_latitude: 43.65, clock_in_longitude: -79.38)

    get "/api/v1/employee/earnings", headers: auth_header(tech_user)
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["account_type"]).to eq("direct")
    expect(body["tips"]["owed"].to_f).to eq(20.0)
    expect(body["fuel_reimbursement"].to_f).to eq(8.5)
    expect(body).not_to have_key("partner")
  end

  context "partner provider" do
    let(:partner) { create(:partner, platform_fee_pct: 20) }
    before { profile.update!(partner: partner) }

    it "sees ONLY the partner payout at the split — no fuel, no individual tips" do
      b = paid_booking(total: 100) # completed, unsettled -> owed to partner
      # A tip + a fuelled shift exist, but a partner provider must NOT see them.
      Tip.create!(booking: b, employee_profile: profile, amount: 20, method: "card", status: "collected")
      profile.shifts.create!(status: "closed", clock_in_at: 2.days.ago, clock_out_at: 2.days.ago + 1.hour,
                             booking: b, fuel_reimbursement: 8.50, distance_km: 10,
                             clock_in_latitude: 43.65, clock_in_longitude: -79.38)

      get "/api/v1/employee/earnings", headers: auth_header(tech_user)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["account_type"]).to eq("partner")
      expect(body).not_to have_key("fuel_reimbursement")
      expect(body).not_to have_key("tips")
      # gross 100, 20% platform fee -> 80 owed to the partner.
      expect(body["partner"]["gross_unsettled"].to_f).to eq(100.0)
      expect(body["partner"]["owed"].to_f).to eq(80.0)
      expect(body["partner"]["share_pct"].to_f).to eq(80.0)
    end
  end
end
