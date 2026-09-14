require "digest"

# A one-time SMS code for phone login. The code is stored HASHED (never
# plaintext). Codes are short-lived and attempt-limited so they can't be brute
# forced. One live code per phone at a time (a new request supersedes the old).
class PhoneVerification < ApplicationRecord
  CODE_TTL     = 10.minutes
  MAX_ATTEMPTS = 5
  # Don't let one phone spam requests: min gap between sends.
  RESEND_GAP   = 30.seconds

  validates :phone, :code_digest, :expires_at, presence: true

  scope :for_phone, ->(phone) { where(phone: normalize(phone)) }
  scope :live,      -> { where(verified_at: nil).where("expires_at > ?", Time.current) }

  # Issue a fresh code for a phone. Returns [record, raw_code]. Raises
  # TooSoon if the last request was within RESEND_GAP.
  class TooSoon < StandardError; end

  def self.issue!(phone)
    phone = normalize(phone)
    recent = for_phone(phone).where("created_at > ?", RESEND_GAP.ago).order(created_at: :desc).first
    raise TooSoon if recent

    raw = format("%06d", SecureRandom.random_number(1_000_000))
    record = create!(phone: phone, code_digest: digest(raw), expires_at: CODE_TTL.from_now)
    [ record, raw ]
  end

  # Verify a submitted code against the newest live code for the phone. Returns
  # true on success (marks it verified), false otherwise. Increments attempts and
  # invalidates the code once attempts are exhausted.
  def self.verify(phone, code)
    record = for_phone(phone).live.order(created_at: :desc).first
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

  # E.164-ish: strip spaces/dashes/parens, keep a leading +.
  def self.normalize(phone)
    p = phone.to_s.strip
    plus = p.start_with?("+")
    digits = p.gsub(/\D/, "")
    plus ? "+#{digits}" : digits
  end

  def self.digest(code)
    Digest::SHA256.hexdigest(code)
  end
end
