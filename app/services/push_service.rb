# Sends a push notification to all of a user's registered devices via FCM.
# Best-effort: a failure never raises into the caller. Tokens FCM reports as
# unregistered are pruned so we stop sending to dead installs. No-op when FCM
# isn't configured (Fcm::Client#configured? is false).
class PushService
  def self.push(user:, title:, body:, data: {})
    new.push(user: user, title: title, body: body, data: data)
  end

  def push(user:, title:, body:, data: {})
    client = Fcm::Client.new
    return unless client.configured?

    user.device_tokens.find_each do |device|
      result = client.send_to(token: device.token, title: title, body: body, data: data)
      device.destroy if result == :unregistered
    end
  rescue StandardError => e
    Rails.logger.warn("[PushService] push to user #{user&.id} failed: #{e.message}")
  end
end
