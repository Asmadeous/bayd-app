require "rails_helper"
require "active_job/test_helper"

RSpec.describe BookingReminders, type: :service do
  include ActiveJob::TestHelper

  let(:customer) { create(:user) }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60) }

  def booking(starts_at:)
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: "confirmed",
                    subtotal: 40, travel_fee: 0, total: 40)
  end

  it "enqueues the confirmation immediately and the timed reminders for the future" do
    b = booking(starts_at: 3.days.from_now)
    expect { described_class.schedule(b) }.to have_enqueued_job(BookingReminderJob).at_least(3).times
  end

  it "enqueues confirmed with no wait and day_before/day_of/dispatch scheduled" do
    b = booking(starts_at: 3.days.from_now)
    described_class.schedule(b)
    kinds = enqueued_jobs.select { |j| j[:job] == BookingReminderJob }.map { |j| j[:args].last }
    expect(kinds).to include("confirmed", "day_before", "day_of", "dispatch")
  end

  it "does not schedule a day_before that is already in the past (same-day booking)" do
    b = booking(starts_at: 2.hours.from_now) # 24h-before is in the past
    described_class.schedule(b)
    kinds = enqueued_jobs.select { |j| j[:job] == BookingReminderJob }.map { |j| j[:args].last }
    expect(kinds).to include("confirmed")
    expect(kinds).not_to include("day_before")
  end
end
