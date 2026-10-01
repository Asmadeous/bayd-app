# Sends one Web Push message to a browser subscription: the payload encrypted
# for that browser (RFC 8291, aes128gcm) and the request signed with our VAPID
# key (RFC 8292), so any push service (Google, Mozilla, Apple) accepts it.
#
# Needs VAPID_PRIVATE_KEY (a P-256 private key, PEM). The public key the
# browser subscribes with is derived from it. Without it, nothing is sent.
class WebPushClient
  TTL_SECONDS = 24 * 60 * 60
  RECORD_SIZE = 4096

  def self.configured? = private_key.present?

  def self.private_key
    pem = ENV["VAPID_PRIVATE_KEY"].to_s.gsub("\\n", "\n")
    return if pem.blank?

    @private_key ||= OpenSSL::PKey::EC.new(pem)
  rescue OpenSSL::PKey::ECError
    nil
  end

  # The key browsers subscribe with (uncompressed P-256 point, base64url).
  def self.public_key_b64
    return unless configured?

    Base64.urlsafe_encode64(private_key.public_key.to_bn.to_s(2), padding: false)
  end

  # :ok, or :gone when the browser unsubscribed (the caller removes the row).
  def deliver(subscription, payload)
    body = encrypt(payload.to_json, subscription)
    response = Faraday.post(subscription.endpoint, body, headers_for(subscription.endpoint))
    return :gone if [ 404, 410 ].include?(response.status)
    raise "push service answered #{response.status}" unless response.success?

    :ok
  end

  private

  def headers_for(endpoint)
    {
      "TTL" => TTL_SECONDS.to_s,
      "Urgency" => "normal",
      "Content-Type" => "application/octet-stream",
      "Content-Encoding" => "aes128gcm",
      "Authorization" => "vapid t=#{vapid_jwt(endpoint)}, k=#{self.class.public_key_b64}"
    }
  end

  def vapid_jwt(endpoint)
    uri = URI(endpoint)
    claims = {
      aud: "#{uri.scheme}://#{uri.host}",
      exp: 12.hours.from_now.to_i,
      sub: "mailto:#{ENV.fetch('SUPPORT_EMAIL', 'Bookings@baydspa.ca')}"
    }
    JWT.encode(claims, self.class.private_key, "ES256")
  end

  # local/salt are only passed by the spec (RFC 8291's worked example).
  def encrypt(plaintext, subscription, local: OpenSSL::PKey::EC.generate("prime256v1"), salt: SecureRandom.random_bytes(16))
    ua_public = decode(subscription.p256dh)
    auth_secret = decode(subscription.auth)
    group = OpenSSL::PKey::EC::Group.new("prime256v1")

    local_public = local.public_key.to_bn.to_s(2)
    shared = local.dh_compute_key(OpenSSL::PKey::EC::Point.new(group, OpenSSL::BN.new(ua_public, 2)))

    ikm = hkdf(shared, auth_secret, "WebPush: info\0" + ua_public + local_public, 32)
    key = hkdf(ikm, salt, "Content-Encoding: aes128gcm\0", 16)
    nonce = hkdf(ikm, salt, "Content-Encoding: nonce\0", 12)

    cipher = OpenSSL::Cipher.new("aes-128-gcm").encrypt
    cipher.key = key
    cipher.iv = nonce
    # A single record: the payload, then the 0x02 "last record" delimiter.
    ciphertext = cipher.update(plaintext + "\x02") + cipher.final + cipher.auth_tag

    salt + [ RECORD_SIZE ].pack("N") + [ local_public.bytesize ].pack("C") + local_public + ciphertext
  end

  def hkdf(ikm, salt, info, length)
    OpenSSL::KDF.hkdf(ikm, salt: salt, info: info, length: length, hash: "SHA256")
  end

  def decode(value)
    Base64.urlsafe_decode64(value.to_s + "=" * ((4 - value.to_s.length % 4) % 4))
  end
end
