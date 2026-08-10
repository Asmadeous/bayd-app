# Helcim — online shopping (products + gift-card purchases).
#
# Backend-driven: create a payment session, redirect the customer to Helcim's
# hosted page, and confirm via the Helcim webhook. No card data touches our
# frontend or servers.
#
# Gem-free (Faraday). No-ops cleanly when the API token isn't configured.
require "digest"
require "openssl"
require "base64"

class HelcimService
  BASE_URL = "https://api.helcim.com/v2/".freeze

  def self.configured?
    api_token.present?
  end

  # Create a hosted payment session. invoice_number links the eventual webhook
  # transaction back to our order. line_items is an array of hashes with
  # :description, :quantity, :price (each required by Helcim's invoiceRequest).
  def self.initialize_session(amount: nil, payment_type: "purchase", currency: "CAD", invoice_number: nil, line_items: [])
    return { success: false, error: "not_configured" } unless configured?

    body = { paymentType: payment_type, currency: currency }.compact
    body[:amount] = amount if amount

    if invoice_number.present?
      invoice_req = { invoiceNumber: invoice_number }
      if line_items.present?
        invoice_req[:lineItems] = line_items.map do |li|
          price = li[:price].to_f.round(2)
          qty   = li[:quantity].to_i
          { description: li[:description], quantity: qty, price: price, total: (price * qty).round(2) }
        end
      end
      body[:invoiceRequest] = invoice_req
    end

    resp = connection.post("helcim-pay/initialize") { |req| req.body = body }
    if success?(resp)
      { success: true, checkout_token: resp.body["checkoutToken"], secret_token: resp.body["secretToken"] }
    else
      { success: false, error: error_message(resp) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # Gateway hosted-payment URL the frontend redirects to. Base is configurable
  # since the exact hosted endpoint depends on the Helcim product/account.
  def self.hosted_url(checkout_token)
    base = ENV["HELCIM_HOSTED_URL"].presence
    return nil if base.blank?

    sep = base.include?("?") ? "&" : "?"
    "#{base}#{sep}checkoutToken=#{checkout_token}"
  end

  # Fetch a transaction (used by the webhook to confirm + link to an order).
  def self.get_transaction(transaction_id)
    return nil unless configured?

    resp = connection.get("card-transactions/#{transaction_id}")
    success?(resp) ? resp.body : nil
  rescue Faraday::Error
    nil
  end

  # Verify an inbound Helcim webhook (Svix-style signing, per Helcim docs):
  #   signedContent = "<webhook-id>.<webhook-timestamp>.<raw body>"
  #   key           = base64-decode(verifier token)
  #   signature     = base64( HMAC-SHA256(key, signedContent) )
  # The `webhook-signature` header is a space-delimited list of "v1,<sig>"
  # entries; a match against any is valid. Returns false when unconfigured.
  def self.verify_webhook(raw_body, signature_header, webhook_id:, webhook_timestamp:)
    token = ENV["HELCIM_WEBHOOK_VERIFIER_TOKEN"].presence
    return false if token.blank? || signature_header.blank?

    signed_content = "#{webhook_id}.#{webhook_timestamp}.#{raw_body}"
    key      = Base64.decode64(token)
    expected = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA256", key, signed_content))

    signature_header.to_s.split(/\s+/).any? do |entry|
      provided = entry.split(",", 2).last.to_s   # strip the "v1," version prefix
      provided.present? && ActiveSupport::SecurityUtils.secure_compare(expected, provided)
    end
  end

  # Charge a stored card token (auto-billing recurring bookings).
  def self.charge_card(card_token:, amount:, currency: "CAD", invoice_number: nil)
    return { success: false, error: "not_configured" } unless configured?

    resp = connection.post("payment/purchase") do |req|
      req.headers["idempotency-key"] = SecureRandom.uuid
      req.body = {
        amount: amount.to_f.round(2),
        currency: currency,
        cardData: { cardToken: card_token },
        invoiceNumber: invoice_number
      }.compact
    end

    if success?(resp)
      { success: true, transaction_id: resp.body["transactionId"], status: resp.body["status"] }
    else
      { success: false, error: error_message(resp) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # Verify a HelcimPay.js result: the response hash is SHA-256 of the raw
  # transaction JSON concatenated with the session's secretToken.
  def self.valid_response?(raw:, hash:, secret:)
    return false if raw.blank? || hash.blank? || secret.blank?

    Digest::SHA256.hexdigest("#{raw}#{secret}") == hash
  end

  def self.connection
    Faraday.new(BASE_URL) do |f|
      f.request :json
      f.response :json
      f.headers["api-token"] = api_token
      f.headers["accept"] = "application/json"
    end
  end

  def self.success?(response)
    response.status.between?(200, 299) && response.body.is_a?(Hash)
  end

  def self.error_message(response)
    body = response.body
    msg = body.is_a?(Hash) ? (body["errors"] || body["message"]) : nil
    (msg.is_a?(Hash) ? msg.values.join(", ") : msg).presence || "Helcim request failed (#{response.status})"
  end

  def self.api_token = ENV.fetch("HELCIM_API_TOKEN", "")
end
