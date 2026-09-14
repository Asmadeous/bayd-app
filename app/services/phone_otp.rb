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
    unless client.configured?
      # Dev convenience ONLY: with no SMS provider, log the code so a developer
      # can complete the flow locally. Never in production — there the code is
      # only ever delivered by SMS.
      Rails.logger.info("[PhoneOtp] DEV code for #{record.phone}: #{raw}") if Rails.env.development?
      return :unconfigured
    end

    client.send_sms(to: record.phone, text: "Your B.A.Y.D verification code is #{raw}. It expires in 10 minutes.")
    :sent
  rescue PhoneVerification::TooSoon
    :too_soon
  end

  # Verify a code and return the matching CUSTOMER (find-or-create by phone), or
  # nil on a bad/expired code. Staff/admin are refused (they use passwords).
  # On signup the caller passes email + first_name; they seed a NEW account only
  # (an existing customer's details are never overwritten by a later sign-in).
  def verify(phone, code, email: nil, first_name: nil)
    return nil unless PhoneVerification.verify(phone, code)

    normalized = PhoneVerification.normalize(phone)
    user = User.find_by(phone: normalized)
    return user if user&.customer?
    return nil if user # a staff/admin phone can't use passwordless login

    attrs = { phone: normalized, role: :customer }
    attrs[:email] = email.strip.downcase if email.present?
    attrs[:first_name] = first_name.strip if first_name.present?
    User.create!(attrs)
  end
end
