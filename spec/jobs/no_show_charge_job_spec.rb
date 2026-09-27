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

  it "charges the full booking price to the card on file and records it" do
    booking = build_booking(user: carded_customer)
    expect(SquareService).to receive(:charge_card)
      .with(hash_including(customer_id: "cust_1", card_id: "card_1", amount_cents: 10000))
      .and_return({ success: true, payment_id: "sqpay_1", status: "COMPLETED" })

    expect { described_class.perform_now(booking.id) }
      .to change { booking.payments.where(processor: "square_no_show").count }.by(1)

    payment = booking.payments.find_by(processor: "square_no_show")
    expect(payment.amount).to eq(100)
    expect(payment.status).to eq("paid")
  end

  it "is idempotent - a second run does not double-charge" do
    booking = build_booking(user: carded_customer)
    allow(SquareService).to receive(:charge_card).and_return({ success: true, payment_id: "sqpay_1" })

    described_class.perform_now(booking.id)
    expect(SquareService).not_to receive(:charge_card)
    described_class.perform_now(booking.id)
  end

  it "charges only what is still owed after a prior payment" do
    booking = build_booking(user: carded_customer)
    booking.payments.create!(amount: 50, status: "paid", method: "card", processor: "square", paid_at: Time.current)
    expect(SquareService).to receive(:charge_card)
      .with(hash_including(amount_cents: 5000))
      .and_return({ success: true, payment_id: "sqpay_1" })

    described_class.perform_now(booking.id)
    expect(booking.payments.find_by(processor: "square_no_show").amount).to eq(50)
  end

  it "charges nothing when the booking is already paid in full" do
    booking = build_booking(user: carded_customer)
    booking.payments.create!(amount: 100, status: "paid", method: "card", processor: "square", paid_at: Time.current)
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

  it "tells the customer they missed it, mentioning the amount charged" do
    booking = build_booking(user: carded_customer)
    allow(SquareService).to receive(:charge_card).and_return({ success: true, payment_id: "sqpay_1" })

    described_class.perform_now(booking.id)
    note = Notification.find_by(user: carded_customer, booking: booking, kind: "booking_no_show")
    expect(note.title).to eq("You missed your appointment")
    expect(note.body).to include("$100.00 owed for the booking was charged")
  end

  it "still tells the customer when there is no card to charge" do
    customer = create(:user)
    booking = build_booking(user: customer)

    described_class.perform_now(booking.id)
    note = Notification.find_by(user: customer, booking: booking, kind: "booking_no_show")
    expect(note.title).to eq("You missed your appointment")
    expect(note.body).not_to include("charged")
  end

  describe "when the balance can't be collected" do
    let!(:admin) { create(:user, role: :admin) }

    def admin_alerts(booking)
      Notification.where(booking: booking, kind: "booking_no_show_uncollected")
    end

    it "alerts admins and emails the team when there is no card" do
      booking = build_booking(user: create(:user))

      expect { described_class.perform_now(booking.id) }
        .to have_enqueued_mail(AdminMailer, :no_show_uncollected).with(booking, "No card on file")

      alert = admin_alerts(booking).find_by(user: admin)
      expect(alert.body).to include("$100.00 is still owed", "No card on file")
      expect(booking.payments.count).to eq(0)
    end

    it "alerts admins with the Square error when the card is declined" do
      booking = build_booking(user: carded_customer)
      allow(SquareService).to receive(:charge_card).and_return({ success: false, error: "CARD_DECLINED" })

      expect { described_class.perform_now(booking.id) }
        .to have_enqueued_mail(AdminMailer, :no_show_uncollected)
        .with(booking, "Card charge failed: CARD_DECLINED")
      expect(admin_alerts(booking).find_by(user: admin).body).to include("CARD_DECLINED")
    end

    it "tells the customer the balance is still owed" do
      customer = create(:user)
      booking = build_booking(user: customer)

      described_class.perform_now(booking.id)
      note = Notification.find_by(user: customer, booking: booking, kind: "booking_no_show")
      expect(note.body).to include("$100.00 for the booking is still owed")
    end

    it "does not re-alert or re-email on a second run" do
      booking = build_booking(user: create(:user))
      described_class.perform_now(booking.id)

      expect { described_class.perform_now(booking.id) }
        .not_to have_enqueued_mail(AdminMailer, :no_show_uncollected)
      expect(admin_alerts(booking).count).to eq(1)
    end

    it "does not alert admins when the charge succeeds" do
      booking = build_booking(user: carded_customer)
      allow(SquareService).to receive(:charge_card).and_return({ success: true, payment_id: "sqpay_1" })

      expect { described_class.perform_now(booking.id) }
        .not_to have_enqueued_mail(AdminMailer, :no_show_uncollected)
      expect(admin_alerts(booking)).to be_empty
    end

    it "does not alert admins when nothing is owed" do
      booking = build_booking(user: create(:user))
      booking.payments.create!(amount: 100, status: "paid", method: "cash", processor: "offline", paid_at: Time.current)

      described_class.perform_now(booking.id)
      expect(admin_alerts(booking)).to be_empty
    end
  end

  it "fires on the no_show status transition via the model callback" do
    booking = build_booking(user: carded_customer, status: "confirmed")
    expect(NoShowChargeJob).to receive(:perform_later).with(booking.id)
    booking.update!(status: :no_show)
  end
end
