# Reconciles inbound payment webhooks against our records. The webhook is the
# authoritative confirmation — not the browser.
class PaymentWebhookProcessor
  # Helcim transaction event → settle the linked record (idempotent).
  def self.helcim(event)
    txn_id = event.payload["id"]&.to_s
    return event.mark_processed! if txn_id.blank?

    txn = HelcimService.get_transaction(txn_id)
    if txn && approved?(txn["status"])
      settle(txn["invoiceNumber"], processor: "helcim", txn_ref: txn_id, amount: txn["amount"])
    end
    event.mark_processed!
  rescue StandardError => e
    Rails.logger.error("[PaymentWebhookProcessor] helcim #{txn_id}: #{e.message}")
  end

  # Square payment event → settle the linked record (idempotent).
  def self.square(event)
    payment = event.payload.dig("data", "object", "payment")
    return event.mark_processed! unless payment && approved?(payment["status"])

    ref = payment["reference_id"]
    if ref.blank? && payment["order_id"].present?
      ref = SquareService.get_order(payment["order_id"])&.dig("reference_id")
    end

    cents = payment.dig("amount_money", "amount").to_i
    settle(ref, processor: "square", txn_ref: payment["id"], amount: cents / 100.0)
    event.mark_processed!
  rescue StandardError => e
    Rails.logger.error("[PaymentWebhookProcessor] square: #{e.message}")
  end

  # Route a confirmed payment to the right record + action.
  #   GCT-<id>            → credit a gift-card top-up
  #   GC-/BKG-/ORD-<id>   → mark the purchase/booking/order paid
  def self.settle(reference, processor:, txn_ref:, amount:)
    ref = reference.to_s
    if ref.start_with?("GCT-")
      GiftCard.find_by(id: ref.delete_prefix("GCT-"))&.topup!(amount, method: processor)
    else
      payable_for(ref)&.mark_paid!(processor: processor, reference: txn_ref, amount: amount)
    end
  end

  def self.order_for(invoice_number)
    id = invoice_number.to_s.delete_prefix("ORD-")
    Order.find_by(id: id)
  end

  # A payment reference points at an Order ("ORD-<id>"), Booking ("BKG-<id>"),
  # or GiftCard purchase ("GC-<id>"). All three respond to mark_paid!.
  def self.payable_for(reference)
    ref = reference.to_s
    if ref.start_with?("BKG-")
      Booking.find_by(id: ref.delete_prefix("BKG-"))
    elsif ref.start_with?("GC-")
      GiftCard.find_by(id: ref.delete_prefix("GC-"))
    else
      order_for(ref)
    end
  end

  def self.approved?(status)
    %w[approved completed captured paid].include?(status.to_s.downcase)
  end
end
