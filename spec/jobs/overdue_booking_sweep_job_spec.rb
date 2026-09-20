require "rails_helper"

RSpec.describe OverdueBookingSweepJob, type: :job do
  let(:service)  { create(:service, duration_minutes: 60, price: 100) }
  let(:tech)     { create(:employee_profile) }
  let(:customer) { create(:user) }
  let!(:admin)   { create(:user, role: :admin) }

  # A confirmed booking whose start is `mins_ago` minutes in the past.
  def booking_started(mins_ago)
    starts = mins_ago.minutes.ago
    Booking.create!(
      user: customer, employee_profile: tech, service: service,
      status: "confirmed", client_type: "adult", party_size: 1,
      starts_at: starts, ends_at: starts + 1.hour,
      subtotal: 100, travel_fee: 0, total: 100
    )
  end

  def open_shift_for(booking)
    tech.shifts.create!(
      booking: booking, status: "open", clock_in_at: booking.starts_at,
      clock_in_latitude: 43.5, clock_in_longitude: -79.6
    )
  end

  it "flags a confirmed booking past grace with no clock-in" do
    booking = booking_started(TimeClock::GRACE_MIN + 5)

    expect { described_class.perform_now }
      .to change { Notification.where(booking: booking, kind: "booking_overdue").count }.from(0)

    expect(Notification.exists?(user: tech.user, booking: booking, kind: "booking_overdue")).to be(true)
    expect(Notification.exists?(user: admin, booking: booking, kind: "booking_overdue")).to be(true)
  end

  it "ignores a booking that has a shift (tech clocked in)" do
    booking = booking_started(TimeClock::GRACE_MIN + 5)
    open_shift_for(booking)

    expect { described_class.perform_now }
      .not_to change(Notification, :count)
  end

  it "ignores a booking still inside the grace window" do
    booking_started(TimeClock::GRACE_MIN - 5)

    expect { described_class.perform_now }
      .not_to change(Notification, :count)
  end

  it "notifies only once across repeated runs (idempotent)" do
    booking_started(TimeClock::GRACE_MIN + 5)

    described_class.perform_now
    expect { described_class.perform_now }
      .not_to change(Notification, :count)
  end
end
