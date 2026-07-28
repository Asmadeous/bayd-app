# Single entry point for customer notifications. Persists an in-app Notification
# record (always works) and best-effort delivers it over email + SMS.
class NotificationService
  def self.deliver(user:, kind:, title:, body: nil, booking: nil, action_url: nil, sms_body: nil, metadata: {})
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

    # SMS — only if the user opted into marketing and has a phone on file.
    if user.marketing_opt_in && user.phone.present?
      SmsService.send_message(to: user.phone, body: sms_body || "#{title} #{action_url}".strip)
    end

    notification
  rescue => e
    Rails.logger.error("[NotificationService] #{kind} failed for user #{user.id}: #{e.message}")
    notification
  end
end
