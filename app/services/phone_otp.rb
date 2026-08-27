# Phone-login OTP flow for CUSTOMERS: issue a code, text it via Infobip, and
# verify it. An alternative to the email magic-link. Staff/admin keep passwords.
# The Infobip send is best-effort behind Infobip::Client (inert without creds).
module PhoneOtp
  module_function

  # Issue + text a code. Returns :sent, :too_soon (rate limited), or :unconfigured
  # (SMS not set up — the caller still succeeds silently so we don't leak config).
  def request_code(phone)
    record, raw = PhoneVerification.issue!(phone)

    client = Infobip::Client.new
    return :unconfigured unless client.configured?

    client.send_sms(to: record.phone, text: "Your B.A.Y.D verification code is #{raw}. It expires in 10 minutes.")
    :sent
  rescue PhoneVerification::TooSoon
    :too_soon
  end

  # Verify a code and return the matching CUSTOMER (find-or-create by phone), or
  # nil on a bad/expired code. Staff/admin are refused (they use passwords).
  def verify(phone, code)
    return nil unless PhoneVerification.verify(phone, code)

    normalized = PhoneVerification.normalize(phone)
    user = User.find_by(phone: normalized)
    return user if user&.customer?
    return nil if user # a staff/admin phone can't use passwordless login

    User.create!(phone: normalized, role: :customer)
  end
end
