# Schedules the four booking reminders on Solid Queue. Called when a booking is
# created (and re-called on reschedule). Timed reminders use wait_until; the job
# itself re-checks the booking is still active + not already sent, so a stale
# reminder from before a reschedule/cancel simply no-ops when it fires (we don't
# need to hunt down and cancel the old jobs).
#
#   confirmed  -> now (on book)
#   day_before -> 24h before starts_at (skipped if that's already past)
#   day_of     -> that morning, 9am company-zone (skipped if past)
#   dispatch   -> staff, that morning 8am company-zone (skipped if past)
class BookingReminders
  def self.schedule(booking)
    new(booking).schedule
  end

  def initialize(booking)
    @booking = booking
  end

  def schedule
    return unless @booking&.starts_at

    enqueue_now("confirmed")
    enqueue_at("day_before", 24.hours.before(@booking.starts_at))
    enqueue_at("day_of", morning_of(@booking.starts_at, hour: 9))
    enqueue_at("dispatch", morning_of(@booking.starts_at, hour: 8))
  end

  private

  def enqueue_now(reminder)
    BookingReminderJob.perform_later(@booking.id, reminder)
  end

  # Only schedule a future reminder; if the moment is already past (e.g. booked
  # for tomorrow so "day before" is now, or a same-day booking), skip it — the
  # confirmation already went out and we don't want a reminder firing in the past.
  def enqueue_at(reminder, at)
    return if at.nil? || at <= Time.current

    BookingReminderJob.set(wait_until: at).perform_later(@booking.id, reminder)
  end

  # 8/9am in the company zone on the booking's date.
  def morning_of(instant, hour:)
    local = instant.in_time_zone(BusinessHours.zone)
    BusinessHours.zone.local(local.year, local.month, local.day, hour, 0)
  end
end
