require "digest"

# A one-time email code for email login. Mirrors PhoneVerification: the code is
# stored HASHED (never plaintext), short-lived, and attempt-limited so it can't
# be brute forced. One live code per email at a time (a new request supersedes
# the old). This is the in-app alternative to the magic link, which can't
# complete inside a Capacitor app without deep linking.
class EmailVerification < ApplicationRecord
  CODE_TTL     = 10.minutes
  MAX_ATTEMPTS = 5
  # Don't let one address spam requests: min gap between sends.
  RESEND_GAP   = 30.seconds

  validates :email, :code_digest, :expires_at, presence: true

  scope :for_email, ->(email) { where(email: normalize(email)) }
  scope :live,      -> { where(verified_at: nil).where("expires_at > ?", Time.current) }

  class TooSoon < StandardError; end

  # Issue a fresh code for an email. Returns [record, raw_code]. Raises TooSoon
  # if the last request was within RESEND_GAP.
  def self.issue!(email)
    email = normalize(email)
    recent = for_email(email).where("created_at > ?", RESEND_GAP.ago).order(created_at: :desc).first
    raise TooSoon if recent

    raw = format("%06d", SecureRandom.random_number(1_000_000))
    record = create!(email: email, code_digest: digest(raw), expires_at: CODE_TTL.from_now)
    [ record, raw ]
  end

  # Verify a submitted code against the newest live code for the email. Returns
  # true on success (marks it verified), false otherwise. Increments attempts and
  # burns the code once attempts are exhausted.
  def self.verify(email, code)
    record = for_email(email).live.order(created_at: :desc).first
    return false unless record

    record.increment!(:attempts)
    if record.attempts > MAX_ATTEMPTS
      record.update_columns(expires_at: Time.current) # burn it
      return false
    end

    return false unless ActiveSupport::SecurityUtils.secure_compare(record.code_digest, digest(code.to_s))

    record.update_columns(verified_at: Time.current)
    true
  end

  def self.normalize(email)
    email.to_s.strip.downcase
  end

  def self.digest(code)
    Digest::SHA256.hexdigest(code)
  end
end
