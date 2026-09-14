require "rails_helper"

RSpec.describe MeetingReminderJob, type: :job do
  let(:customer)  { create(:user, first_name: "Ada") }
  let(:tech_user) { create(:user, first_name: "Susi", email: "susi@baydspa.ca", role: :employee) }
  let(:tech)      { create(:employee_profile, user: tech_user) }
  let(:service)   { create(:service, name: "Manicure", duration_minutes: 60) }

  def booking(starts_at: 3.days.from_now, status: "confirmed")
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: status,
                    subtotal: 40, travel_fee: 0, total: 40)
  end

  def meeting_for(booking, scheduled_at:, status: "scheduled")
    Meeting.create!(booking: booking, scheduled_at: scheduled_at, status: status)
  end

  it "reminds BOTH the customer and the assigned tech" do
    m = meeting_for(booking, scheduled_at: 3.hours.from_now)
    described_class.perform_now(m.id, "day_before")

    expect(customer.notifications.where(kind: "meeting_reminder_day_before").count).to eq(1)
    expect(tech_user.notifications.where(kind: "meeting_reminder_day_before").count).to eq(1)
  end

  it "is idempotent — a second run does not double-send to either party" do
    m = meeting_for(booking, scheduled_at: 3.hours.from_now)
    described_class.perform_now(m.id, "day_before")

    expect { described_class.perform_now(m.id, "day_before") }
      .not_to change { Notification.where(kind: "meeting_reminder_day_before").count }
  end

  it "does not collide with the booking reminder that shares the same booking" do
    b = booking
    m = meeting_for(b, scheduled_at: 3.hours.from_now)
    # A prior booking reminder on the same booking must not suppress the meeting one.
    NotificationService.deliver(user: customer, kind: :booking_reminder_day_before,
                                title: "x", booking: b)
    described_class.perform_now(m.id, "day_before")

    expect(customer.notifications.where(kind: "meeting_reminder_day_before").count).to eq(1)
  end

  it "skips a cancelled meeting" do
    m = meeting_for(booking, scheduled_at: 3.hours.from_now, status: "cancelled")
    expect { described_class.perform_now(m.id, "day_before") }
      .not_to change { Notification.count }
  end

  it "skips a completed meeting" do
    m = meeting_for(booking, scheduled_at: 3.hours.from_now, status: "completed")
    expect { described_class.perform_now(m.id, "soon") }
      .not_to change { Notification.count }
  end

  it "skips a stale day_before whose meeting is now far in the future (rescheduled out)" do
    m = meeting_for(booking(starts_at: 10.days.from_now), scheduled_at: 10.days.from_now)
    expect { described_class.perform_now(m.id, "day_before") }
      .not_to change { Notification.count }
  end

  it "skips a stale 'soon' whose meeting is no longer within ~90 min" do
    m = meeting_for(booking, scheduled_at: 5.hours.from_now)
    expect { described_class.perform_now(m.id, "soon") }
      .not_to change { Notification.count }
  end
end
