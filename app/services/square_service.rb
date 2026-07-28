require "openssl"
require "base64"

class SquareService
  SQUARE_VERSION = "2024-11-20"

  def self.configured?
    access_token.present? && location_id.present?
  end

  # ── Hosted checkout for an Order (redirect model) ───────────────────────────
  # reference_id links the Square order back to ours in the webhook.
  def self.create_checkout(order, redirect_url:)
    return { success: false, error: "not_configured" } unless configured?

    line_items = order.order_items.map do |i|
      {
        name: i.name.to_s,
        quantity: i.quantity.to_s,
        base_price_money: { amount: (i.price.to_f * 100).round, currency: "CAD" }
      }
    end

    response = connection.post("/v2/online-checkout/payment-links") do |req|
      req.body = {
        idempotency_key: SecureRandom.uuid,
        order: { location_id: location_id, reference_id: "ORD-#{order.id}", line_items: line_items },
        checkout_options: {
          redirect_url: redirect_url,
          merchant_support_email: ENV.fetch("SUPPORT_EMAIL", "support@baydspa.ca")
        }
      }
    end

    if response.status == 200
      { success: true, url: response.body.dig("payment_link", "url") }
    else
      { success: false, error: error_message(response) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # Fetch a payment / order (used by the webhook to link back to our order).
  def self.get_payment(payment_id)
    return nil unless configured?

    resp = connection.get("/v2/payments/#{payment_id}")
    resp.status == 200 ? resp.body["payment"] : nil
  rescue Faraday::Error
    nil
  end

  def self.get_order(order_id)
    return nil unless configured?

    resp = connection.get("/v2/orders/#{order_id}")
    resp.status == 200 ? resp.body["order"] : nil
  rescue Faraday::Error
    nil
  end

  # Verify a Square webhook: HMAC-SHA256 of (notification_url + raw_body) with
  # the webhook signature key, base64. Lenient when no key configured (dev).
  def self.verify_webhook(raw_body, signature, notification_url)
    key = ENV["SQUARE_WEBHOOK_SIGNATURE_KEY"].presence
    return false if key.blank? || signature.blank?

    expected = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA256", key, "#{notification_url}#{raw_body}"))
    ActiveSupport::SecurityUtils.secure_compare(expected, signature.to_s)
  end

  # ── Hosted checkout (legacy items-based; kept for reference) ─────────────────
  def self.create_payment_link(items, redirect_url:)
    line_items = items.map do |item|
      {
        name: item[:name].to_s,
        quantity: item[:quantity].to_s,
        base_price_money: { amount: item[:price_cents].to_i, currency: "CAD" }
      }
    end

    response = connection.post("/v2/online-checkout/payment-links") do |req|
      req.body = {
        idempotency_key: SecureRandom.uuid,
        order: { location_id: location_id, line_items: line_items },
        checkout_options: {
          redirect_url: redirect_url,
          merchant_support_email: ENV.fetch("SUPPORT_EMAIL", "support@baydspa.ca")
        }
      }
    end

    if response.status == 200
      { success: true, url: response.body.dig("payment_link", "url") }
    else
      { success: false, error: error_message(response) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # ── Customer identity ───────────────────────────────────────────────────────
  # Creates a Square customer record for a user. Returns the customer id.
  def self.create_customer(user)
    response = connection.post("/v2/customers") do |req|
      req.body = {
        idempotency_key: SecureRandom.uuid,
        given_name:     user.first_name,
        family_name:    user.last_name,
        email_address:  user.email,
        phone_number:   user.phone.presence
      }.compact
    end

    if response.status == 200
      { success: true, customer_id: response.body.dig("customer", "id") }
    else
      { success: false, error: error_message(response) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # ── Card on file ────────────────────────────────────────────────────────────
  # source_id is a single-use card token produced by the Square Web Payments SDK.
  def self.save_card(customer_id:, source_id:)
    response = connection.post("/v2/cards") do |req|
      req.body = {
        idempotency_key: SecureRandom.uuid,
        source_id: source_id,
        card: { customer_id: customer_id }
      }
    end

    if response.status == 200
      card = response.body["card"]
      { success: true, card_id: card["id"], brand: card["card_brand"], last4: card["last_4"] }
    else
      { success: false, error: error_message(response) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  def self.disable_card(card_id)
    connection.post("/v2/cards/#{card_id}/disable")
    true
  rescue Faraday::Error
    false
  end

  # ── Charge a stored card (auto-billing recurring bookings) ──────────────────
  def self.charge_card(customer_id:, card_id:, amount_cents:, note: nil)
    response = connection.post("/v2/payments") do |req|
      req.body = {
        idempotency_key: SecureRandom.uuid,
        source_id:   card_id,
        customer_id: customer_id,
        location_id: location_id,
        amount_money: { amount: amount_cents.to_i, currency: "CAD" },
        note: note
      }.compact
    end

    if response.status == 200
      payment = response.body["payment"]
      { success: true, payment_id: payment["id"], status: payment["status"] }
    else
      { success: false, error: error_message(response) }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end

  # ── Internals ───────────────────────────────────────────────────────────────
  def self.connection
    Faraday.new(base_url) do |f|
      f.request :json
      f.response :json
      f.headers["Authorization"] = "Bearer #{access_token}"
      f.headers["Square-Version"] = SQUARE_VERSION
    end
  end

  def self.error_message(response)
    Array(response.body["errors"]).map { |e| e["detail"] }.join(", ").presence ||
      "Square request failed (#{response.status})"
  end

  def self.base_url
    ENV.fetch("SQUARE_BASE_URL", "https://connect.squareupsandbox.com")
  end

  def self.access_token
    ENV.fetch("SQUARE_ACCESS_TOKEN", "")
  end

  def self.location_id
    ENV.fetch("SQUARE_LOCATION_ID", "")
  end
end
