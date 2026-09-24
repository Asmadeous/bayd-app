# Tells the customer and the assigned tech that a booking was cancelled, whichever
# path cancelled it. Best-effort and idempotent: one booking_cancelled notification
# per recipient per booking. A subscription whose auto-charge failed cancels its
# booking and already sends the customer a charge_failed notice, so the customer
# is not told twice.
class BookingCancelledJob < ApplicationJob
  queue_as :default

  def perform(booking_id)
    booking = Booking.includes(:service, :user, employee_profile: :user).find_by(id: booking_id)
    return unless booking&.cancelled?

    svc = booking.service&.name || "appointment"
    when_str = booking.starts_at.in_time_zone(BusinessHours.zone).strftime("%A, %b %-d at %-l:%M %p")

    notify_customer(booking, svc, when_str)
    notify_tech(booking, svc, when_str)
  rescue StandardError => e
    Rails.logger.warn("[BookingCancelledJob] booking #{booking_id} failed: #{e.message}")
  end

  private

  def notify_customer(booking, svc, when_str)
    user = booking.user
    return unless user
    return if already_sent?(user, booking)
    return if Notification.exists?(user: user, booking: booking, kind: :charge_failed)

    NotificationService.deliver(
      user: user, kind: :booking_cancelled,
      title: "Your appointment was cancelled",
      body: "Your #{svc} on #{when_str} was cancelled. Book again anytime.",
      booking: booking,
      action_url: "#{app_url}/book"
    )
  end

  def notify_tech(booking, svc, when_str)
    tech = booking.employee_profile&.user
    return unless tech
    return if already_sent?(tech, booking)

    NotificationService.deliver(
      user: tech, kind: :booking_cancelled,
      title: "Booking cancelled",
      body: "#{svc} for #{booking.user&.first_name.presence || 'a client'} on #{when_str} was cancelled. It's off your schedule.",
      booking: booking,
      action_url: "#{app_url}/staff/schedule"
    )
  end

  def already_sent?(user, booking)
    Notification.exists?(user: user, booking: booking, kind: :booking_cancelled)
  end

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
