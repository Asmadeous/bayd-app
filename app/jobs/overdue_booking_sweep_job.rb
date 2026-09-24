# Periodic sweep (recurring.yml) that catches bookings whose start time has
# passed without the tech clocking in. `TimeClock` only computes "late" WHEN a
# tech clocks in; nothing fires when they never clock in at all - this is that
# missing signal.
#
# It only NOTIFIES (tech + admins) and flags for a human. It deliberately does
# NOT auto-transition to `missed`: auto-blaming on a timer would punish a tech
# whose phone died mid-shift. A person decides the final status.
#
# Idempotent - it runs every few minutes over the same rows, so it sends one
# `booking_overdue` notification per (recipient, booking) and never re-notifies.
class OverdueBookingSweepJob < ApplicationJob
  queue_as :default

  def perform
    cutoff = Time.current - TimeClock::GRACE_MIN.minutes
    overdue_bookings(cutoff).find_each { |booking| flag(booking) }
  end

  private

  # Confirmed bookings whose start is past the grace window and that have NO
  # shift (a tech who clocked in has a shift; one who never did has none).
  def overdue_bookings(cutoff)
    Booking.where(status: "confirmed")
           .where("starts_at < ?", cutoff)
           .where.missing(:shifts)
           .includes(:service, employee_profile: :user)
  end

  def flag(booking)
    notify_tech(booking)
    notify_admins(booking)
  rescue StandardError => e
    Rails.logger.warn("[OverdueBookingSweepJob] booking #{booking.id} failed: #{e.message}")
  end

  def notify_tech(booking)
    tech = booking.employee_profile&.user
    return unless tech
    return if already_notified?(tech, booking)

    svc = booking.service&.name || "your appointment"
    NotificationService.deliver(
      user: tech, kind: :booking_overdue,
      title: "You missed a clock-in",
      body: "Your #{svc} job started at #{local_time(booking)} and you haven't clocked in. Clock in now, or let an admin know if you can't attend.",
      booking: booking,
      action_url: "#{app_url}/staff/schedule"
    )
  end

  def notify_admins(booking)
    User.where(role: :admin).find_each do |admin|
      next if already_notified?(admin, booking)

      tech_name = booking.employee_profile&.user&.first_name || "A technician"
      svc = booking.service&.name || "a booking"
      NotificationService.deliver(
        user: admin, kind: :booking_overdue,
        title: "Overdue booking - no clock-in",
        body: "#{tech_name} hasn't clocked in for #{svc} (started #{local_time(booking)}). Follow up or mark it missed.",
        booking: booking,
        action_url: "#{app_url}/dashboard/admin/bookings"
      )
    end
  end

  def already_notified?(user, booking)
    Notification.exists?(user: user, booking: booking, kind: :booking_overdue)
  end

  def local_time(booking)
    booking.starts_at.in_time_zone(BusinessHours.zone).strftime("%-l:%M %p")
  end

  # Absolute frontend URL so the link works in email + SMS (a relative path is a
  # dead link outside the app).
  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
