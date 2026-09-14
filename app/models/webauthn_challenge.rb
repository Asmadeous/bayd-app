# A short-lived WebAuthn challenge, stored server-side because this is a stateless
# JWT API (no cookie session to hold it between options-request and verify). One
# live challenge per (user, purpose); issuing a new one supersedes the old.
class WebauthnChallenge < ApplicationRecord
  belongs_to :user

  TTL = 5.minutes

  validates :challenge, :purpose, :expires_at, presence: true

  scope :live, -> { where("expires_at > ?", Time.current) }

  # Replace any existing challenge for this (user, purpose) with a fresh one.
  def self.issue!(user, purpose, challenge)
    where(user: user, purpose: purpose).delete_all
    create!(user: user, purpose: purpose, challenge: challenge, expires_at: TTL.from_now)
  end

  # Consume the live challenge for (user, purpose): return its value and delete it
  # (one-time use), or nil if none/expired.
  def self.consume!(user, purpose)
    record = live.find_by(user: user, purpose: purpose)
    return nil unless record

    value = record.challenge
    record.destroy
    value
  end
end
