# A browser that allowed BAYD notifications (the website's equivalent of an
# app's device token). One row per browser; the endpoint is the push service
# address the browser gave us.
class WebPushSubscription < ApplicationRecord
  belongs_to :user

  validates :endpoint, presence: true, uniqueness: true, format: { with: %r{\Ahttps://\S+\z}, message: "must be an https URL" }
  validates :p256dh, :auth, presence: true
end
