require "rails_helper"

RSpec.describe BookingReminderJob, type: :job do
  let(:zone)      { BusinessHours.zone }
  let(:customer)  { create(:user, first_name: "Ada") }
  let(:tech_user) { create(:user, first_name: "Susi", email: "susi@baydspa.ca", role: :employee) }
  let(:tech)      { create(:employee_profile, user: tech_user) }
  let(:service)   { create(:service, name: "Manicure", duration_minutes: 60) }

  def booking(starts_at:, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: status,
                    subtotal: 40, travel_fee: 0, total: 40)
  end

  it "delivers the confirmation to the customer" do
    b = booking(starts_at: 3.days.from_now)
    expect { described_class.perform_now(b.id, "confirmed") }
      .to change { customer.notifications.where(kind: "booking_confirmed").count }.by(1)
  end

  it "sends the dispatch reminder to the assigned STAFF, not the customer" do
    b = booking(starts_at: zone.now.change(hour: 14)) # today
    described_class.perform_now(b.id, "dispatch")
    expect(tech_user.notifications.where(kind: "booking_dispatch").count).to eq(1)
    expect(customer.notifications.where(kind: "booking_dispatch").count).to eq(0)
  end

  it "is idempotent — a second run does not double-send" do
    b = booking(starts_at: 3.days.from_now)
    described_class.perform_now(b.id, "confirmed")
    expect { described_class.perform_now(b.id, "confirmed") }
      .not_to change { customer.notifications.count }
  end

  it "skips a cancelled booking" do
    b = booking(starts_at: 3.days.from_now, status: "cancelled")
    expect { described_class.perform_now(b.id, "confirmed") }
      .not_to change { customer.notifications.count }
  end

  it "skips a day_before reminder whose booking was rescheduled far out (stale job)" do
    b = booking(starts_at: 10.days.from_now) # no longer within ~26h
    expect { described_class.perform_now(b.id, "day_before") }
      .not_to change { customer.notifications.count }
  end

  it "delivers day_before when the booking is actually within ~26h" do
    b = booking(starts_at: 20.hours.from_now)
    expect { described_class.perform_now(b.id, "day_before") }
      .to change { customer.notifications.where(kind: "booking_reminder_day_before").count }.by(1)
  end

  it "delivers day_of only when the booking is today" do
    today = booking(starts_at: zone.now.change(hour: 15))
    expect { described_class.perform_now(today.id, "day_of") }
      .to change { customer.notifications.where(kind: "booking_reminder_day_of").count }.by(1)

    future = booking(starts_at: 5.days.from_now)
    expect { described_class.perform_now(future.id, "day_of") }
      .not_to change { customer.notifications.count }
  end
end
