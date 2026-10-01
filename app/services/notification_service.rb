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
    PushService.push(user: user, title: title, body: body.to_s,
                     data: { kind: kind, booking_id: booking&.id, path: push_path(user, booking) }.compact)

    # Browser notifications (the website's push), for browsers that allowed it.
    WebPushJob.perform_later(user.id, title, body.to_s, web_path(user, action_url)) if user.web_push_subscriptions.exists?

    # SMS — text the confirmation/reminder to the user's phone (customer or staff).
    # Queued + best-effort: no-op when the user has no phone or Infobip is unset.
    NotificationSmsJob.perform_later(notification.id)

    notification
  rescue => e
    Rails.logger.error("[NotificationService] #{kind} failed for user #{user.id}: #{e.message}")
    notification
  end

  # Where clicking a browser notification opens: the notification's own link
  # (a page on this site, or an outside one like a call room or payment page),
  # else the person's dashboard notifications.
  def self.web_path(user, action_url)
    url = action_url.to_s
    site = ENV.fetch("APP_URL", "http://localhost:3001")
    return url.delete_prefix(site).presence || "/" if url.start_with?(site)
    return url if url.start_with?("https://") || (url.start_with?("/") && !url.start_with?("//"))

    role = user.customer? ? "customer" : user.admin? ? "admin" : "employee"
    "/dashboard/#{role}/notifications"
  end

  # Where tapping the push opens in the app: a booking notification opens that
  # booking's page (the job for staff, the appointment for customers); anything
  # else just opens the app.
  def self.push_path(user, booking)
    return unless booking

    user.customer? ? "/app/bookings/view?id=#{booking.id}" : "/staff/schedule/job?id=#{booking.id}"
  end
end
