# Builds (or refreshes, while still open) a franchise's royalty statement for a
# month: money received on its bookings, orders and gift cards that month
# (payments marked paid), minus payments refunded that month, times its
# royalty percentage. A paid statement is never changed.
class RoyaltyStatementBuilder
  PAYABLES = %w[Booking Order GiftCard].freeze

  def self.for_month(franchise, month) = new(franchise, month).build

  def initialize(franchise, month)
    @franchise = franchise
    @start = month.to_date.beginning_of_month
    @end = @start.end_of_month
  end

  def build
    Current.set(franchise: @franchise) do
      statement = RoyaltyStatement.find_or_initialize_by(period_start: @start)
      return statement if statement.status_paid?

      gross = paid_in(period).sum(:amount)
      refunds = Payment.where(status: "refunded", updated_at: period).merge(owned_payments).sum(:amount)
      due = ((gross - refunds) * @franchise.royalty_pct / 100).round(2)
      statement.update!(period_end: @end, gross: gross, refunds: refunds, royalty_pct: @franchise.royalty_pct,
                        royalty_due: [ due, 0 ].max, currency: @franchise.currency)
      statement
    end
  end

  private

  def period = @franchise.zone.local(@start.year, @start.month, @start.day)..@franchise.zone.local(@end.year, @end.month, @end.day).end_of_day

  def paid_in(range) = Payment.where(status: "paid", paid_at: range).merge(owned_payments)

  # Payments whose booking / order / gift card belongs to this franchise.
  def owned_payments
    PAYABLES.map { |type| Payment.where(payable_type: type, payable_id: type.constantize.select(:id)) }.reduce(:or)
  end
end
