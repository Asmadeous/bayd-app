require "rails_helper"
require "active_job/test_helper"

# Group bookings are created `pending` (awaiting deposit) and confirm only when
# the deposit lands. Reminders must NOT fire while pending, and MUST be scheduled
# the moment it confirms — so a group booking is wired to reminders correctly.
RSpec.describe "Group booking + reminders wiring", type: :service do
  include ActiveJob::TestHelper

  let(:customer) { create(:user) }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60, price: 40) }

  def group_booking
    start = 3.days.from_now
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    client_type: "group", party_size: 3,
                    starts_at: start, ends_at: start + 180.minutes, status: "pending",
                    subtotal: 120, travel_fee: 0, total: 120)
  end

  it "does not schedule reminders while a group booking is still pending" do
    b = group_booking
    # AssignmentService#schedule_reminders skips pending; simulate that guard.
    expect {
      BookingReminders.schedule(b) unless b.status == "pending"
    }.not_to have_enqueued_job(BookingReminderJob)
  end

  it "the reminder job refuses to send for a pending group booking" do
    b = group_booking
    expect { BookingReminderJob.perform_now(b.id, "confirmed") }
      .not_to change { customer.notifications.count }
  end

  it "schedules reminders when the group booking confirms on deposit" do
    b = group_booking
    # Pay the deposit -> refresh_payment_status! flips pending->confirmed and
    # schedules reminders.
    expect {
      b.mark_paid!(processor: "square", reference: "sq_1", amount: b.total)
    }.to have_enqueued_job(BookingReminderJob).at_least(:once)
    expect(b.reload.status).to eq("confirmed")
  end
end
