# Collects money for a booking, choosing the mechanism automatically:
#   • customer has a Square card on file  → AUTO-CHARGE it now
#   • no card on file                     → create a Square PAYMENT LINK (emailed)
#
# Handles the service amount and an optional tip together. Tips are recorded per
# technician (Tip model) for payout tracking. The webhook is authoritative for
# link payments; auto-charges settle synchronously here.
class BookingPaymentService
  Result = Struct.new(:success, :mode, :url, :error, keyword_init: true) do
    def success? = success
  end

  def initialize(booking)
    @booking = booking
    @user    = booking.user
  end

  # amount   — service $ to collect now (e.g. full total, deposit, or balance)
  # tip      — optional gratuity $ for the assigned technician
  # note           — Square note / invoice context
  # gift_card_code — optional; its balance is applied to the service amount first,
  #                  then only the remainder (plus tip) is charged.
  def collect(amount:, tip: 0, note: nil, gift_card_code: nil)
    amount = amount.to_d
    tip    = tip.to_d

    gift_applied = apply_gift_card(gift_card_code, amount)
    amount -= gift_applied

    if amount + tip <= 0
      return Result.new(success: true, mode: gift_applied.positive? ? :gift_card_paid : :nothing_due)
    end

    @user.card_on_file? ? auto_charge(amount, tip, note) : payment_link(amount, tip)
  end

  private

  # Redeem up to `amount` from the gift card toward this booking; records a paid
  # gift-card payment and returns the dollar amount applied (0 if unusable).
  def apply_gift_card(code, amount)
    return 0.to_d if code.blank? || amount <= 0

    card = GiftCard.active.find_by(code: code.to_s.strip)
    return 0.to_d unless card&.redeemable?

    redeem = [ card.current_balance.to_d, amount ].min
    return 0.to_d if redeem <= 0

    card.redeem!(redeem, booking: @booking)
    @booking.payments.create!(
      amount: redeem, status: "paid", method: "gift_card",
      processor: "gift_card", processor_ref: card.code, paid_at: Time.current
    )
    @booking.refresh_payment_status!
    redeem
  rescue StandardError => e
    Rails.logger.warn("[BookingPaymentService] gift card #{code} failed: #{e.message}")
    0.to_d
  end

  def auto_charge(amount, tip, note)
    return Result.new(success: false, error: "no_card_on_file") unless @user.card_on_file?

    result = SquareService.charge_card(
      customer_id:  @user.square_customer_id,
      card_id:      @user.square_card_id,
      amount_cents: ((amount + tip) * 100).round,
      note:         note || "BKG-#{@booking.id}"
    )
    return Result.new(success: false, error: result[:error]) unless result[:success]

    @booking.mark_paid!(processor: "square", reference: result[:payment_id], amount: amount)
    record_tip(tip, ref: result[:payment_id]) if tip.positive?
    Result.new(success: true, mode: :charged)
  end

  def payment_link(amount, tip)
    line_items = [ { name: line_name, quantity: 1, price_cents: (amount * 100).round } ]
    line_items << { name: "Gratuity", quantity: 1, price_cents: (tip * 100).round } if tip.positive?

    result = SquareService.create_booking_link(
      booking_id: @booking.id,
      line_items: line_items,
      redirect_url: "#{app_url}/checkout/confirmation?booking=#{@booking.id}"
    )
    return Result.new(success: false, error: result[:error]) unless result[:success]

    # Pending payment so the webhook can reconcile by the BKG- reference. The tip
    # is recorded now but only counts toward payout once the booking is paid
    # (see Tip.owed_to_tech), so an abandoned link never creates a phantom payout.
    @booking.payments.create!(amount: amount, status: "pending", method: "card", processor: "square")
    record_tip(tip, ref: nil) if tip.positive?
    Result.new(success: true, mode: :link, url: result[:url])
  end

  def record_tip(amount, ref:)
    @booking.tips.create!(
      employee_profile: @booking.employee_profile,
      amount: amount, method: "card", status: "collected", processor_ref: ref
    )
  end

  def line_name
    "#{@booking.service.name} — booking ##{@booking.id}"
  end

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
