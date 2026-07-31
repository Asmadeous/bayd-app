# Single entry point for customer notifications. Persists an in-app Notification
# record (always works) and delivers it over email.
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

    notification
  rescue => e
    Rails.logger.error("[NotificationService] #{kind} failed for user #{user.id}: #{e.message}")
    notification
  end
end
