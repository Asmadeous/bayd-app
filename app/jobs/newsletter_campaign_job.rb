# Emails a dashboard-written newsletter to every subscribed address. One
# deliver_later per subscriber, so a slow or failed send never blocks the rest.
class NewsletterCampaignJob < ApplicationJob
  queue_as :low

  def perform(campaign_id)
    campaign = NewsletterCampaign.find_by(id: campaign_id)
    return unless campaign&.sent?

    NewsletterSubscriber.subscribed.find_each do |subscriber|
      NewsletterMailer.campaign(campaign, subscriber).deliver_later
    end
  end
end
