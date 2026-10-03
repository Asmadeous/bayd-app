# Monthly (recurring.yml): last month's royalty statement for every live franchise.
class MonthlyRoyaltyJob < ApplicationJob
  queue_as :low

  def perform(month = Date.current.prev_month)
    Franchise.status_live.find_each do |franchise|
      RoyaltyStatementBuilder.for_month(franchise, month)
    rescue StandardError => e
      Rails.logger.error("[MonthlyRoyaltyJob] franchise #{franchise.id}: #{e.message}")
    end
  end
end
