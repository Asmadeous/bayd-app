# An FCM registration token for one mobile/web app install, owned by a user. Push
# notifications (PushService) are sent to every one of a user's device tokens.
# A token is globally unique to one install.
class DeviceToken < ApplicationRecord
  belongs_to :user

  enum :platform, { android: "android", ios: "ios", web: "web" }, prefix: true

  validates :token, presence: true, uniqueness: true

  # Register (or re-point) a token to this user. If the token already exists on
  # another user (shared device, account switch), it moves to the new owner.
  def self.register!(user:, token:, platform:)
    record = find_or_initialize_by(token: token)
    record.update!(user: user, platform: platform)
    record
  end
end
