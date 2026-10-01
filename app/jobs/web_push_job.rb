# Sends a notification to every browser the user allowed notifications in.
# Queued so a slow push service never holds up the request that caused it; a
# browser that unsubscribed is forgotten.
class WebPushJob < ApplicationJob
  queue_as :default

  def perform(user_id, title, body, url)
    return unless WebPushClient.configured?

    user = User.find_by(id: user_id)
    return unless user

    client = WebPushClient.new
    user.web_push_subscriptions.find_each do |subscription|
      subscription.destroy if client.deliver(subscription, { title: title, body: body, url: url }) == :gone
    rescue StandardError => e
      Rails.logger.warn("[WebPushJob] push to subscription #{subscription.id} failed: #{e.message}")
    end
  end
end
