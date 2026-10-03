# Collects money for a whole visit in ONE charge (card on file) or ONE hosted
# link (reference VST-<id>), then records it per booking: each line gets its
# share as its own Payment, and the tip is split across the techs by line price,
# so every tech's earnings, payouts and no-show handling stay per booking.
class VisitPaymentService
  Result = BookingPaymentService::Result

  # Split `amount` across `weights` in cents (largest remainder), so the shares
  # always add up exactly. Equal shares when every weight is zero.
  def self.split(amount, weights)
    return [] if weights.empty?

    cents = (amount.to_d * 100).round
    weights = weights.map { |w| [ w.to_d, 0 ].max }
    weights = weights.map { 1.to_d } if weights.sum.zero?
    raw = weights.map { |w| cents * w / weights.sum }
    shares = raw.map(&:floor)
    order = raw.each_with_index.sort_by { |r, i| [ -(r - r.floor), i ] }.map(&:last)
    (cents - shares.sum).times { |k| shares[order[k % shares.size]] += 1 }
    shares.map { |c| c.to_d / 100 }
  end

  def initialize(visit)
    @visit = visit
    @user  = visit.user
  end

  # amount         - service $ to collect now for the whole visit (total, deposit, balance)
  # tip            - optional gratuity, split across the techs
  # gift_card_code - optional; its balance pays first, only the rest is charged
  def collect(amount:, tip: 0, gift_card_code: nil)
    amount = [ amount.to_d, @visit.outstanding_balance ].min
    tip    = tip.to_d

    gift_applied = apply_gift_card(gift_card_code, amount)
    amount -= gift_applied
    return Result.new(success: true, mode: gift_applied.positive? ? :gift_card_paid : :nothing_due) if amount + tip <= 0

    @user.card_on_file? ? auto_charge(amount, tip) : payment_link(amount, tip)
  end

  private

  def lines = @visit.bookings.reject(&:cancelled?)

  def shares_of(amount) = self.class.split(amount, lines.map(&:outstanding_balance))

  def apply_gift_card(code, amount)
    return 0.to_d if code.blank? || amount <= 0

    card = GiftCard.active.find_by(code: code.to_s.strip)
    return 0.to_d unless card&.redeemable?

    redeem = [ card.current_balance.to_d, amount ].min
    return 0.to_d if redeem <= 0

    ActiveRecord::Base.transaction do
      shares_of(redeem).zip(lines).each do |share, booking|
        next unless share.positive?

        card.redeem!(share, booking: booking)
        booking.payments.create!(amount: share, status: "paid", method: "gift_card",
                                 processor: "gift_card", processor_ref: card.code, paid_at: Time.current)
        booking.refresh_payment_status!
      end
    end
    redeem
  rescue StandardError => e
    Rails.logger.warn("[VisitPaymentService] gift card #{code} failed: #{e.message}")
    0.to_d
  end

  def auto_charge(amount, tip)
    profile = @user.payment_profile
    result = SquareService.charge_card(
      customer_id:  profile.customer_ref,
      card_id:      profile.card_ref,
      amount_cents: franchise.minor_units(amount + tip),
      note:         reference
    )
    return Result.new(success: false, error: result[:error]) unless result[:success]

    shares_of(amount).zip(lines).each do |share, booking|
      booking.mark_paid!(processor: "square", reference: result[:payment_id], amount: share) if share.positive?
    end
    record_tips(tip, ref: result[:payment_id])
    Result.new(success: true, mode: :charged)
  end

  def payment_link(amount, tip)
    shares = shares_of(amount).zip(lines).select { |share, _| share.positive? }
    items = shares.map do |share, booking|
      { name: "#{booking.service.name} (visit ##{@visit.id})", quantity: 1, price_cents: franchise.minor_units(share) }
    end
    items << { name: "Gratuity", quantity: 1, price_cents: franchise.minor_units(tip) } if tip.positive?

    result = SquareService.create_reference_link(
      reference: reference, line_items: items,
      redirect_url: "#{app_url}/checkout/confirmation?visit=#{@visit.id}"
    )
    return Result.new(success: false, error: result[:error]) unless result[:success]

    # Pending per line so the VST- webhook settles each exact share
    # (Visit#mark_paid!). Tips count toward payout only once paid (Tip.owed_to_tech).
    shares.each do |share, booking|
      booking.payments.create!(amount: share, status: "pending", method: "card", processor: "square")
    end
    record_tips(tip, ref: nil)
    Result.new(success: true, mode: :link, url: result[:url])
  end

  def record_tips(tip, ref:)
    return unless tip.positive?

    self.class.split(tip, lines.map(&:total)).zip(lines).each do |share, booking|
      next unless share.positive?

      booking.tips.create!(employee_profile: booking.employee_profile, amount: share,
                           method: "card", status: "collected", processor_ref: ref)
    end
  end

  def reference = "VST-#{@visit.id}"

  def franchise = @visit.franchise

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
