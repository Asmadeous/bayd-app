# A newsletter written in the dashboard and emailed to every subscriber. Sent
# once; the record keeps what went out and to how many people.
class NewsletterCampaign < ApplicationRecord
  include FranchiseScoped

  belongs_to :sent_by, class_name: "User", optional: true

  validates :subject, presence: true, length: { maximum: 150 }
  validates :body, presence: true, length: { maximum: 20_000 }

  def sent? = sent_at.present?

  def deliver!
    raise ArgumentError, "already sent" if sent?

    update!(sent_at: Time.current, recipients_count: NewsletterSubscriber.subscribed.count)
    NewsletterCampaignJob.perform_later(id)
  end
end
