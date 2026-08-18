class MagicLinkToken < ApplicationRecord
  belongs_to :user

  TTL = 15.minutes

  scope :usable, -> { where(used_at: nil).where("expires_at > ?", Time.current) }

  # Generates a raw token, stores only its digest, and returns the RAW token
  # (the only time it's ever available — the email link needs it, the DB never
  # sees it again).
  def self.issue!(user)
    raw = SecureRandom.urlsafe_base64(32)
    create!(user: user, token_digest: digest(raw), expires_at: TTL.from_now)
    raw
  end

  # Finds the usable token row matching a raw token from an email link, or nil
  # if it doesn't exist, already expired, or was already used.
  def self.find_usable(raw_token)
    return nil if raw_token.blank?

    usable.find_by(token_digest: digest(raw_token))
  end

  def consume!
    update!(used_at: Time.current)
  end

  def self.digest(raw)
    Digest::SHA256.hexdigest(raw)
  end
end
