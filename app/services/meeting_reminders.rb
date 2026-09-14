# Schedules the work-scope video call reminders on Solid Queue. Called when a
# Meeting is created. Timed reminders use wait_until; the job re-checks the
# meeting is still scheduled + not already sent, so a stale reminder from before
# a reschedule/cancel simply no-ops when it fires.
#
#   day_before -> 24h before scheduled_at (skipped if that's already past)
#   soon       -> 30 min before scheduled_at (skipped if past)
#
# Both reminders go to BOTH the customer and the assigned tech (see
# MeetingReminderJob). The meeting_scheduled notice already went out on create;
# these are the approaching-call nudges.
class MeetingReminders
  def self.schedule(meeting)
    new(meeting).schedule
  end

  def initialize(meeting)
    @meeting = meeting
  end

  def schedule
    return unless @meeting&.scheduled_at

    enqueue_at("day_before", 24.hours.before(@meeting.scheduled_at))
    enqueue_at("soon", 30.minutes.before(@meeting.scheduled_at))
  end

  private

  # Only schedule a future reminder; if the moment is already past (e.g. a call
  # scheduled for later today so "day before" is now), skip it.
  def enqueue_at(reminder, at)
    return if at.nil? || at <= Time.current

    MeetingReminderJob.set(wait_until: at).perform_later(@meeting.id, reminder)
  end
end
