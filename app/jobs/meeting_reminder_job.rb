# Fires ONE work-scope video call reminder of a given kind to BOTH the customer
# and the assigned technician. Scheduled ahead of time via MeetingReminders
# (wait_until). Idempotent + self-guarding, mirroring BookingReminderJob:
#   - a cancelled/completed meeting is skipped,
#   - a reminder already recorded for this (recipient, meeting, kind) is skipped
#     (survives a retry or a duplicate enqueue),
#   - a stale reminder (the meeting was rescheduled away from this window) no-ops.
#
# Notifications key on the meeting's booking (NotificationService takes booking:,
# not meeting:), so the distinct meeting_* kinds keep these from colliding with
# the booking reminders that share the same booking.
class MeetingReminderJob < ApplicationJob
  queue_as :default

  REMINDERS = {
    "day_before" => { kind: "meeting_reminder_day_before" },
    "soon"       => { kind: "meeting_reminder_soon" }
  }.freeze

  def perform(meeting_id, reminder)
    meeting = Meeting.find_by(id: meeting_id)
    return unless meeting&.status_scheduled?
    return unless meeting.scheduled_at
    return unless still_relevant?(meeting, reminder) # a reschedule may have moved it

    spec = REMINDERS.fetch(reminder)
    booking = meeting.booking

    recipients_for(booking).each do |recipient|
      # Idempotency: one notification of this kind per (recipient, booking).
      next if Notification.exists?(user: recipient, booking: booking, kind: spec[:kind])

      NotificationService.deliver(
        user:  recipient,
        kind:  spec[:kind],
        title: "Work-scope video call reminder",
        body:  body_for(reminder, meeting),
        booking: booking,
        action_url: meeting.url
      )
    end
  end

  private

  # Both parties on the booking: the customer and the assigned technician's user.
  def recipients_for(booking)
    [ booking.user, booking.employee_profile&.user ].compact.uniq
  end

  # Does this reminder still match the meeting's CURRENT time? A reschedule moves
  # scheduled_at while the originally-enqueued job still fires at the old moment;
  # only deliver if it's genuinely near the right window now.
  #   day_before -> within the next ~26h (and still in the future)
  #   soon       -> within the next ~90 min (and still in the future)
  def still_relevant?(meeting, reminder)
    at = meeting.scheduled_at
    case reminder
    when "day_before"
      at > Time.current && at <= 26.hours.from_now
    when "soon"
      at > Time.current && at <= 90.minutes.from_now
    else
      false
    end
  end

  def body_for(reminder, meeting)
    svc = meeting.booking.service&.name || "your appointment"
    when_local = meeting.scheduled_at.in_time_zone(BusinessHours.zone).strftime("%b %-d at %-l:%M %p")
    case reminder
    when "day_before" then "Your work-scope video call for #{svc} is tomorrow, #{when_local}. Tap to join when it's time."
    when "soon"       then "Your work-scope video call for #{svc} starts soon, #{when_local}. Tap to join."
    end
  end
end
