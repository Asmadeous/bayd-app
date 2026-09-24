require "rails_helper"

RSpec.describe BookingCancelledJob, type: :job do
  let(:service)  { create(:service, duration_minutes: 60, price: 100) }
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }

  def build_booking(status: "cancelled")
    Booking.create!(
      user: customer, employee_profile: tech, service: service,
      status: status, client_type: "adult", party_size: 1,
      starts_at: 2.days.from_now, ends_at: 2.days.from_now + 1.hour,
      subtotal: 100, travel_fee: 0, total: 100
    )
  end

  it "tells the customer and the tech, named by the action" do
    booking = build_booking
    described_class.perform_now(booking.id)

    customer_note = Notification.find_by(user: customer, booking: booking, kind: "booking_cancelled")
    tech_note     = Notification.find_by(user: tech.user, booking: booking, kind: "booking_cancelled")
    expect(customer_note.title).to eq("Your appointment was cancelled")
    expect(tech_note.title).to eq("Booking cancelled")
  end

  it "is idempotent - a second run does not double-notify" do
    booking = build_booking
    described_class.perform_now(booking.id)

    expect { described_class.perform_now(booking.id) }.not_to change(Notification, :count)
  end

  it "skips the customer when a failed subscription charge already told them" do
    booking = build_booking
    Notification.create!(user: customer, booking: booking, kind: "charge_failed", title: "x")

    described_class.perform_now(booking.id)
    expect(Notification.where(user: customer, kind: "booking_cancelled")).to be_empty
    expect(Notification.where(user: tech.user, kind: "booking_cancelled").count).to eq(1)
  end

  it "no-ops when the booking is not cancelled" do
    booking = build_booking(status: "confirmed")
    expect { described_class.perform_now(booking.id) }.not_to change(Notification, :count)
  end

  it "fires on the cancelled status transition via the model callback" do
    booking = build_booking(status: "confirmed")
    expect(described_class).to receive(:perform_later).with(booking.id)
    booking.update!(status: :cancelled)
  end
end
