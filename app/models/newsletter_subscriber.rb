class NewsletterSubscriber < ApplicationRecord
  belongs_to :user, optional: true

  enum :status, { subscribed: "subscribed", unsubscribed: "unsubscribed", bounced: "bounced" }

  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :unsubscribe_token, presence: true, uniqueness: true

  before_validation :assign_token, on: :create
  before_validation { email&.downcase! }

  private

  def assign_token
    self.unsubscribe_token ||= SecureRandom.urlsafe_base64(24)
  end
end
