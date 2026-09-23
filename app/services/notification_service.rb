# Single entry point for notifications (customer AND staff). Persists an in-app
# Notification record (always works) and fans it out to SMS, push, and (for a
# select few kinds) email. Every channel is best-effort - a failure in one never
# blocks the others or the core write.
#
# Channel policy (deliberate, to stop the email flood - email doesn't scale for
# routine confirmations/reminders):
#   • in-app  → ALWAYS (the notification record itself)
#   • push    → ALWAYS
#   • SMS     → ALWAYS (confirmations + reminders reach the phone)
#   • email   → ONLY the kinds in EMAIL_KINDS (review requests). Invoices and
#     order receipts are emailed by their OWN mailers, not through here.
class NotificationService
  # Kinds that still warrant an email. Everything else is SMS + push + in-app.
  EMAIL_KINDS = %w[review_request].freeze

  def self.deliver(user:, kind:, title:, body: nil, booking: nil, action_url: nil, metadata: {})
    notification = user.notifications.create!(
      kind: kind,
      title: title,
      body: body,
      booking: booking,
      action_url: action_url,
      metadata: metadata
    )

    # Email — ONLY for the whitelisted kinds (review requests). Routine
    # confirmations/reminders no longer email; they go by SMS + push + in-app.
    CustomerMailer.notify(notification).deliver_later if EMAIL_KINDS.include?(kind.to_s)

    # Push — lock-screen notification to the user's devices (best-effort; no-op
    # when FCM isn't configured). Never breaks the in-app path.
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
