require "rails_helper"

RSpec.describe BookingMissedJob, type: :job do
  let(:service)  { create(:service, duration_minutes: 60, price: 100) }
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }

  def build_booking(status: "missed")
    Booking.create!(
      user: customer, employee_profile: tech, service: service,
      status: status, client_type: "adult", party_size: 1,
      starts_at: 1.day.ago, ends_at: 1.day.ago + 1.hour,
      subtotal: 100, travel_fee: 0, total: 100
    )
  end

  it "notifies the customer with a reschedule offer" do
    booking = build_booking

    expect { described_class.perform_now(booking.id) }
      .to change { Notification.where(user: customer, booking: booking, kind: "booking_missed").count }.by(1)

    note = Notification.find_by(user: customer, booking: booking, kind: "booking_missed")
    expect(note.action_url).to eq("/book")
  end

  it "never charges the customer" do
    booking = build_booking
    expect { described_class.perform_now(booking.id) }
      .not_to change(Payment, :count)
  end

  it "is idempotent - a second run does not double-notify" do
    booking = build_booking
    described_class.perform_now(booking.id)

    expect { described_class.perform_now(booking.id) }
      .not_to change(Notification, :count)
  end

  it "no-ops when the booking is not missed" do
    booking = build_booking(status: "confirmed")
    expect { described_class.perform_now(booking.id) }
      .not_to change(Notification, :count)
  end
end
