# Reconciles inbound payment webhooks against our records. The webhook is the
# authoritative confirmation — not the browser.
class PaymentWebhookProcessor
  # Helcim transaction event → mark the linked order paid (idempotent).
  def self.helcim(event)
    txn_id = event.payload["id"]&.to_s
    return event.mark_processed! if txn_id.blank?

    txn = HelcimService.get_transaction(txn_id)
    if txn
      order = order_for(txn["invoiceNumber"])
      if order && approved?(txn["status"])
        order.mark_paid!(processor: "helcim", reference: txn_id, amount: txn["amount"])
      end
    end
    event.mark_processed!
  rescue StandardError => e
    Rails.logger.error("[PaymentWebhookProcessor] helcim #{txn_id}: #{e.message}")
  end

  # Square payment event → mark the linked order paid (idempotent).
  def self.square(event)
    payment = event.payload.dig("data", "object", "payment")
    return event.mark_processed! unless payment && approved?(payment["status"])

    ref = payment["reference_id"]
    if ref.blank? && payment["order_id"].present?
      ref = SquareService.get_order(payment["order_id"])&.dig("reference_id")
    end

    payable = payable_for(ref)
    if payable
      cents = payment.dig("amount_money", "amount").to_i
      payable.mark_paid!(processor: "square", reference: payment["id"], amount: cents / 100.0)
    end
    event.mark_processed!
  rescue StandardError => e
    Rails.logger.error("[PaymentWebhookProcessor] square: #{e.message}")
  end

  def self.order_for(invoice_number)
    id = invoice_number.to_s.delete_prefix("ORD-")
    Order.find_by(id: id)
  end

  # Square references may point at an Order ("ORD-<id>") or a Booking ("BKG-<id>").
  def self.payable_for(reference)
    ref = reference.to_s
    if ref.start_with?("BKG-")
      Booking.find_by(id: ref.delete_prefix("BKG-"))
    else
      order_for(ref)
    end
  end

  def self.approved?(status)
    %w[approved completed captured paid].include?(status.to_s.downcase)
  end
end
