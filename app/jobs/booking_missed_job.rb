# Notifies the customer when a booking is marked `missed` (the tech failed to
# attend). The client is NEVER charged for a missed booking - this only tells
# them what happened and points them to reschedule. Best-effort and idempotent:
# one `booking_missed` notification per booking, and a failure is logged, never
# raised, so marking a booking missed always succeeds.
class BookingMissedJob < ApplicationJob
  queue_as :default

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    return unless booking&.missed?

    user = booking.user
    return unless user

    # Idempotency: one missed notification per booking.
    return if Notification.exists?(user: user, booking: booking, kind: :booking_missed)

    svc = booking.service&.name || "your appointment"
    NotificationService.deliver(
      user: user,
      kind: :booking_missed,
      title: "We missed your #{svc} appointment",
      body: "We're sorry - your technician couldn't make it. No charge was applied. Tap to rebook at a time that works for you.",
      booking: booking,
      action_url: "/book"
    )
  rescue StandardError => e
    Rails.logger.warn("[BookingMissedJob] booking #{booking_id} failed: #{e.message}")
  end
end
