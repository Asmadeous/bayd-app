# Builds an Invoice record (line items + tax breakdown) from a source:
# Booking, Order, or GiftCard. Amounts charged are treated as tax-inclusive;
# HST is shown as a derived breakdown. Gift cards are not taxed at purchase.
class InvoiceBuilder
  def initialize(source)
    @source = source
  end

  def build
    case @source
    when Booking  then invoice_for(@source.user, "booking", booking_lines, @source.total, taxable: true)
    when Order    then invoice_for(@source.user, "order", order_lines, @source.total, taxable: true)
    when GiftCard then invoice_for(@source.purchaser, "gift_card", gift_card_lines, @source.initial_balance, taxable: false)
    end
  end

  private

  def invoice_for(user, kind, lines, gross, taxable:)
    return unless user

    gross = gross.to_f.round(2)
    tax = taxable ? (gross - gross / (1 + Invoice::HST_RATE)).round(2) : 0.0

    Invoice.create!(
      user: user,
      invoiceable: @source,
      kind: kind,
      subtotal: (gross - tax).round(2),
      tax: tax,
      total: gross,
      tax_rate: taxable ? Invoice::HST_RATE : 0,
      currency: "CAD",
      payment_method: payment_method,
      status: "paid",
      paid_at: Time.current,
      line_items: lines
    )
  end

  def booking_lines
    b = @source
    lines = [ line("#{b.service&.name} — #{b.starts_at&.strftime('%b %-d, %Y')}", 1, b.subtotal) ]
    lines << line("Travel fee", 1, b.travel_fee) if b.travel_fee.to_f.positive?
    lines
  end

  def order_lines
    @source.order_items.map { |i| line(i.name, i.quantity, i.price, i.price.to_f * i.quantity) }
  end

  def gift_card_lines
    [ line("Gift card #{@source.code}", 1, @source.initial_balance) ]
  end

  def line(description, qty, unit_price, amount = nil)
    {
      "description" => description.to_s,
      "quantity"    => qty,
      "unit_price"  => unit_price.to_f.round(2),
      "amount"      => (amount || unit_price.to_f).round(2)
    }
  end

  def payment_method
    @source.respond_to?(:payments) ? @source.payments.order(:created_at).last&.method || "card" : "card"
  end
end
