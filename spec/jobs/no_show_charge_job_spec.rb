require "rails_helper"

RSpec.describe NoShowChargeJob, type: :job do
  let(:service) { create(:service, duration_minutes: 60, price: 100) }
  let(:tech)    { create(:employee_profile) }

  # Built already in the no_show state: the job guards `return unless no_show?`,
  # and these examples invoke the job directly. The callback example below builds
  # a confirmed booking and transitions it, proving the wiring end to end.
  def build_booking(user:, status: "no_show")
    Booking.create!(
      user: user, employee_profile: tech, service: service,
      status: status, client_type: "adult", party_size: 1,
      starts_at: 1.day.from_now, ends_at: 1.day.from_now + 1.hour,
      subtotal: 100, travel_fee: 0, total: 100
    )
  end

  let(:carded_customer) do
    create(:user, square_customer_id: "cust_1", square_card_id: "card_1",
                  card_brand: "Visa", card_last4: "4242")
  end

  before { Setting.set("no_show_fee", "40") }

  it "charges the card on file and records a paid no-show payment" do
    booking = build_booking(user: carded_customer)
    expect(SquareService).to receive(:charge_card)
      .with(hash_including(customer_id: "cust_1", card_id: "card_1", amount_cents: 4000))
      .and_return({ success: true, payment_id: "sqpay_1", status: "COMPLETED" })

    expect { described_class.perform_now(booking.id) }
      .to change { booking.payments.where(processor: "square_no_show").count }.by(1)

    payment = booking.payments.find_by(processor: "square_no_show")
    expect(payment.amount).to eq(40)
    expect(payment.status).to eq("paid")
  end

  it "is idempotent - a second run does not double-charge" do
    booking = build_booking(user: carded_customer)
    allow(SquareService).to receive(:charge_card).and_return({ success: true, payment_id: "sqpay_1" })

    described_class.perform_now(booking.id)
    expect(SquareService).not_to receive(:charge_card)
    described_class.perform_now(booking.id)
  end

  it "no-ops when the fee is zero" do
    Setting.set("no_show_fee", "0")
    booking = build_booking(user: carded_customer)
    expect(SquareService).not_to receive(:charge_card)
    described_class.perform_now(booking.id)
  end

  it "no-ops when the customer has no card on file" do
    booking = build_booking(user: create(:user))
    expect(SquareService).not_to receive(:charge_card)
    described_class.perform_now(booking.id)
  end

  it "records nothing when the charge fails (best-effort)" do
    booking = build_booking(user: carded_customer)
    allow(SquareService).to receive(:charge_card).and_return({ success: false, error: "declined" })

    expect { described_class.perform_now(booking.id) }
      .not_to change(Payment, :count)
  end

  it "fires on the no_show status transition via the model callback" do
    booking = build_booking(user: carded_customer, status: "confirmed")
    expect(NoShowChargeJob).to receive(:perform_later).with(booking.id)
    booking.update!(status: :no_show)
  end
end
