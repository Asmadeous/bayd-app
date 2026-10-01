require "rails_helper"

# Admins collect a booking's balance from the dashboard: a payment link (which
# can be sent to the client) or a charge on the client's saved card. The two
# are explicit so an admin never charges a card when they meant to send a link.
RSpec.describe "POST /api/v1/admin/bookings/:id/payment_link", type: :request do
  let(:admin)    { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:customer) { create(:user, email: "ana@example.com", first_name: "Ana") }
  let(:tech)     { create(:employee_profile, user: create(:user, email: "sue@baydspa.ca", role: :employee)) }
  let(:service)  { create(:service, name: "Manicure", duration_minutes: 30, price: 40) }
  let(:booking) do
    Booking.create!(user: customer, employee_profile: tech, service: service, status: "confirmed",
                    starts_at: 2.days.from_now, ends_at: 2.days.from_now + 30.minutes, subtotal: 40, travel_fee: 0, total: 40)
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def collect(params)
    post "/api/v1/admin/bookings/#{booking.id}/payment_link", params: params, headers: auth_header(admin), as: :json
  end

  before { allow(SquareService).to receive(:create_booking_link).and_return(success: true, url: "https://square.link/u/pay") }

  it "makes a link without charging a saved card, and can send it to the client" do
    customer.update!(square_customer_id: "C1", square_card_id: "card_1")
    expect(SquareService).not_to receive(:charge_card)

    expect { collect(mode: "link", notify: true) }.to change { customer.notifications.count }.by(1)

    expect(response.parsed_body).to eq("mode" => "link", "url" => "https://square.link/u/pay")
    notice = customer.notifications.last
    expect(notice).to have_attributes(kind: "payment_requested", action_url: "https://square.link/u/pay")
    expect(notice.body).to include("$40.00", "Manicure")
  end

  it "doesn't message the client unless asked" do
    expect { collect(mode: "link") }.not_to change(Notification, :count)
  end

  it "charges the saved card only in charge mode" do
    customer.update!(square_customer_id: "C1", square_card_id: "card_1")
    allow(SquareService).to receive(:charge_card).and_return(success: true, payment_id: "sq_1")

    collect(mode: "charge")

    expect(response.parsed_body["mode"]).to eq("charged")
    expect(SquareService).to have_received(:charge_card).with(hash_including(amount_cents: 4000))
  end

  it "refuses to charge when the client has no saved card" do
    collect(mode: "charge")

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body["error"]).to include("no card on file")
  end
end
