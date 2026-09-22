# Texts a notification to the user's phone via Infobip. Best-effort and
# self-guarding: no-op when the user has no phone or Infobip isn't configured, and
# a send failure is logged, never raised - SMS is an extra channel on top of the
# in-app + email + push delivery, so it must never break anything.
class NotificationSmsJob < ApplicationJob
  queue_as :default

  MAX_LEN = 320 # keep the text short; Infobip splits longer, but trim runaway bodies

  def perform(notification_id)
    notification = Notification.find_by(id: notification_id)
    return unless notification

    user = notification.user
    phone = user&.phone.to_s.strip
    return if phone.blank?

    client = Infobip::Client.new
    return unless client.configured?

    client.send_sms(to: phone, text: message_for(notification))
  rescue StandardError => e
    Rails.logger.warn("[NotificationSmsJob] notification #{notification_id} failed: #{e.message}")
  end

  private

  def message_for(notification)
    parts = [ notification.title.presence, notification.body.presence ].compact
    link  = notification.action_url.presence
    parts << link if link&.start_with?("http") # only append a real, clickable URL
    parts.join(" - ").truncate(MAX_LEN)
  end
end
