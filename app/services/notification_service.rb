# Single entry point for notifications (customer AND staff). Persists an in-app
# Notification record (always works) and fans it out to email, push, and SMS.
# Every channel is best-effort - a failure in one never blocks the others or the
# core write.
class NotificationService
  def self.deliver(user:, kind:, title:, body: nil, booking: nil, action_url: nil, metadata: {})
    notification = user.notifications.create!(
      kind: kind,
      title: title,
      body: body,
      booking: booking,
      action_url: action_url,
      metadata: metadata
    )

    # Email — queued so a slow SMTP server never blocks the caller.
    CustomerMailer.notify(notification).deliver_later

    # Push — lock-screen notification to the user's devices (best-effort; no-op
    # when FCM isn't configured). Never breaks the in-app + email path.
    PushService.push(user: user, title: title, body: body.to_s, data: { kind: kind, booking_id: booking&.id }.compact)

    # SMS — text the confirmation/reminder to the user's phone (customer or staff).
    # Queued + best-effort: no-op when the user has no phone or Infobip is unset.
    NotificationSmsJob.perform_later(notification.id)

    notification
  rescue => e
    Rails.logger.error("[NotificationService] #{kind} failed for user #{user.id}: #{e.message}")
    notification
  end
end
