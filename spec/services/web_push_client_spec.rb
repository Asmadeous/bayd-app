require "rails_helper"

RSpec.describe WebPushClient do
  def b64(value) = Base64.urlsafe_decode64(value + "=" * ((4 - value.length % 4) % 4))

  # A P-256 key from its raw private scalar and public point.
  def ec_key(private_b64, public_b64)
    der = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Integer(1),
      OpenSSL::ASN1::OctetString(b64(private_b64)),
      OpenSSL::ASN1::ObjectId("prime256v1", 0, :EXPLICIT),
      OpenSSL::ASN1::BitString(b64(public_b64), 1, :EXPLICIT)
    ]).to_der
    OpenSSL::PKey::EC.new(der)
  end

  # RFC 8291 section 5: the worked example every Web Push library checks against.
  it "encrypts exactly like the RFC 8291 example" do
    subscription = WebPushSubscription.new(
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg"
    )
    local = ec_key("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
                   "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8")

    body = described_class.new.send(:encrypt, "When I grow up, I want to be a watermelon", subscription,
                                    local: local, salt: b64("DGv6ra1nlYgDCS1FRnbzlw"))

    expect(Base64.urlsafe_encode64(body, padding: false)).to eq(
      "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
    )
  end

  it "signs the request with a VAPID token for the push service's origin" do
    key = OpenSSL::PKey::EC.generate("prime256v1")
    stub_const("ENV", ENV.to_h.merge("VAPID_PRIVATE_KEY" => key.to_pem))
    described_class.instance_variable_set(:@private_key, nil)

    headers = described_class.new.send(:headers_for, "https://fcm.googleapis.com/fcm/send/abc")
    token = headers["Authorization"][/t=([^,]+)/, 1]
    claims = JWT.decode(token, key, true, algorithm: "ES256").first

    expect(claims["aud"]).to eq("https://fcm.googleapis.com")
    expect(headers["Authorization"]).to include("k=#{described_class.public_key_b64}")
    expect(headers["Content-Encoding"]).to eq("aes128gcm")
  ensure
    described_class.instance_variable_set(:@private_key, nil)
  end
end
