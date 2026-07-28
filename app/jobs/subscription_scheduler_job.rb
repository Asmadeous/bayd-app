# Daily: drives all active subscriptions on a fixed cadence — creates each due
# subscription's next booking (and charges per-appointment). Independent of
# whether the previous appointment completed, so the cadence never breaks.
class SubscriptionSchedulerJob < ApplicationJob
  queue_as :low

  def perform
    Subscription.due.find_each do |subscription|
      subscription.generate_next_booking!
    rescue StandardError => e
      Rails.logger.error("[SubscriptionSchedulerJob] subscription #{subscription.id}: #{e.message}")
    end
  end
end
