# Email-login OTP flow for CUSTOMERS: issue a 6-digit code, email it, and verify
# it. The in-app alternative to the magic link (which can't complete inside a
# Capacitor app without deep linking). Mirrors PhoneOtp. Staff/admin keep
# passwords and are refused here.
module EmailOtp
  module_function

  # Issue + email a code. Returns :sent or :too_soon (rate limited). Always
  # succeeds for a well-formed request so it can't be used to probe which emails
  # exist (a staff/admin email is the one refusal, mirroring the magic link).
  def request_code(email)
    email = email.to_s.strip
    existing = User.find_by(email: email.downcase)
    return :staff if existing && !existing.customer?

    record, raw = EmailVerification.issue!(email)
    MagicLinkMailer.email_code(record.email, raw).deliver_later
    :sent
  rescue EmailVerification::TooSoon
    :too_soon
  end

  # Verify a code and return the matching CUSTOMER (find-or-create by email), or
  # nil on a bad/expired code. Staff/admin are refused (they use passwords).
  def verify(email, code)
    return nil unless EmailVerification.verify(email, code)

    normalized = EmailVerification.normalize(email)
    user = User.find_by(email: normalized)
    return user if user&.customer?
    return nil if user # a staff/admin email can't use passwordless login

    User.create!(email: normalized, role: :customer)
  end
end
