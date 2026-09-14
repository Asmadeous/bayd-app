require "rails_helper"
require "active_job/test_helper"

RSpec.describe MeetingReminders, type: :service do
  include ActiveJob::TestHelper

  let(:customer) { create(:user) }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60) }

  def booking(starts_at: 3.days.from_now)
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: starts_at, ends_at: starts_at + 60.minutes, status: "confirmed",
                    subtotal: 40, travel_fee: 0, total: 40)
  end

  def meeting(scheduled_at:)
    m = Meeting.new(booking: booking, scheduled_at: scheduled_at)
    m.save!
    m
  end

  it "schedules the day_before and soon reminders for a future call" do
    clear_enqueued_jobs
    m = meeting(scheduled_at: 3.days.from_now)
    described_class.schedule(m)
    kinds = enqueued_jobs.select { |j| j[:job] == MeetingReminderJob }.map { |j| j[:args].last }
    expect(kinds).to include("day_before", "soon")
  end

  it "does not schedule a day_before that is already in the past (call later today)" do
    clear_enqueued_jobs
    m = meeting(scheduled_at: 2.hours.from_now) # 24h-before is in the past
    described_class.schedule(m)
    kinds = enqueued_jobs.select { |j| j[:job] == MeetingReminderJob }.map { |j| j[:args].last }
    expect(kinds).not_to include("day_before")
    expect(kinds).to include("soon")
  end

  it "schedules nothing when the meeting has no scheduled_at" do
    m = Meeting.new(booking: booking)
    m.scheduled_at = nil
    expect { described_class.schedule(m) }.not_to change { enqueued_jobs.count }
  end
end
