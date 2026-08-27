# Fires ONE booking reminder of a given kind. Scheduled ahead of time via
# BookingReminders (wait_until). Idempotent + self-guarding so a reminder is never
# double-sent and never sent for a booking that no longer needs it:
#   - a cancelled/completed booking is skipped,
#   - a reminder already recorded for this (booking, kind) is skipped (survives a
#     retry or a duplicate enqueue),
#   - a reschedule invalidates stale day-before/day-of reminders (they check the
#     booking's CURRENT time still matches the window).
class BookingReminderJob < ApplicationJob
  queue_as :default

  REMINDERS = {
    "confirmed"   => { kind: "booking_confirmed",              audience: :customer },
    "day_before"  => { kind: "booking_reminder_day_before",    audience: :customer },
    "day_of"      => { kind: "booking_reminder_day_of",        audience: :customer },
    "dispatch"    => { kind: "booking_dispatch",               audience: :staff }
  }.freeze

  def perform(booking_id, reminder)
    booking = Booking.find_by(id: booking_id)
    return unless booking
    return unless booking.status.in?(%w[pending confirmed in_progress]) # not cancelled/completed

    spec = REMINDERS.fetch(reminder)
    return unless still_relevant?(booking, reminder) # reschedule may have moved the time

    recipient = spec[:audience] == :staff ? booking.employee_profile&.user : booking.user
    return unless recipient

    # Idempotency: one notification of this kind per booking. If it exists, we've
    # already delivered — don't send again (retry-safe, dup-enqueue-safe).
    return if Notification.exists?(user: recipient, booking: booking, kind: spec[:kind])

    NotificationService.deliver(
      user:  recipient,
      kind:  spec[:kind],
      title: title_for(reminder, booking),
      body:  body_for(reminder, booking),
      booking: booking,
      action_url: "/dashboard/customer/bookings"
    )
  end

  private

  # Does this reminder still match the booking's CURRENT time? A reschedule moves
  # starts_at, but the originally-scheduled job still fires at the old moment; we
  # only want it to deliver if it's genuinely near the right window now. The
  # re-scheduled job (enqueued on reschedule) covers the new time.
  #   confirmed  -> always (fires on book, time-independent)
  #   day_before -> booking is within the next ~26h (and still in the future)
  #   day_of/dispatch -> booking is TODAY (company zone)
  def still_relevant?(booking, reminder)
    case reminder
    when "confirmed"
      true
    when "day_before"
      booking.starts_at > Time.current && booking.starts_at <= 26.hours.from_now
    when "day_of", "dispatch"
      booking.starts_at.in_time_zone(BusinessHours.zone).to_date == Time.current.in_time_zone(BusinessHours.zone).to_date
    else
      false
    end
  end

  def title_for(reminder, booking)
    svc = booking.service&.name || "your appointment"
    case reminder
    when "confirmed"  then "Booking confirmed: #{svc}"
    when "day_before" then "Reminder: #{svc} tomorrow"
    when "day_of"     then "Today: #{svc}"
    when "dispatch"   then "Job today: #{svc}"
    end
  end

  def body_for(reminder, booking)
    when_local = booking.starts_at.in_time_zone(BusinessHours.zone).strftime("%b %-d at %-l:%M %p")
    case reminder
    when "confirmed"  then "You're booked for #{when_local}. We'll remind you before."
    when "day_before" then "See you tomorrow, #{when_local}."
    when "day_of"     then "Your appointment is today at #{when_local}."
    when "dispatch"   then "You have a job today at #{when_local}. Check your schedule."
    end
  end
end
