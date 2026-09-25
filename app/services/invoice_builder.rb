# Builds an Invoice record from a source: Booking, Order, or GiftCard. Amounts
# charged are treated as tax-inclusive; HST is shown as a derived breakdown. Gift
# cards are not taxed at purchase.
#
# Besides the line items, the invoice keeps a `details` snapshot of everything it
# prints (business + client contact, service address, the appointment, who
# performed it, each payment and how it was made), so an issued invoice never
# changes if the booking is edited afterwards.
class InvoiceBuilder
  BUSINESS = {
    "name"    => "Beauty @ Your Door",
    "tagline" => "Mobile beauty services",
    "phone"   => "+1 (647) 970-8259",
    "website" => "baydspa.ca"
  }.freeze

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
    paid_in_full = balance_due(gross) <= 0

    Invoice.create!(
      user: user,
      invoiceable: @source,
      kind: kind,
      subtotal: (gross - tax).round(2),
      tax: tax,
      total: gross,
      tax_rate: taxable ? Invoice::HST_RATE : 0,
      currency: "CAD",
      payment_method: payment_method_label,
      status: paid_in_full ? "paid" : "issued",
      paid_at: paid_in_full ? (last_paid_at || Time.current) : nil,
      line_items: lines,
      details: details_for(user, gross)
    )
  end

  # ── Line items ──────────────────────────────────────────────────────────────

  # The service (per person for a group), each add-on, then any travel fee and
  # overtime. These sum to the booking total: subtotal already includes add-ons
  # (AddonBooker folds them in), travel and overtime sit on top of it.
  def booking_lines
    b = @source
    addons = Array(b.raw.is_a?(Hash) ? b.raw["addons"] : nil)
    addons_total = addons.sum { |a| a["price"].to_d }
    service_amount = b.subtotal.to_d - addons_total
    qty = [ b.party_size.to_i, 1 ].max
    duration = b.service&.duration_minutes

    lines = [
      line(
        [ b.service&.name, duration && "#{duration} min", client_type_label(b) ].compact.join(" · "),
        qty, service_amount / qty, service_amount,
        kind: "service"
      )
    ]
    addons.each do |a|
      label = [ "Add-on: #{a['name']}", a["duration"].present? && "#{a['duration']} min" ].select(&:itself).join(" · ")
      lines << line(label, 1, a["price"], a["price"], kind: "addon")
    end
    lines << line("Travel fee", 1, b.travel_fee, b.travel_fee, kind: "travel") if b.travel_fee.to_d.positive?
    lines << line("Overtime", 1, b.overtime_amount, b.overtime_amount, kind: "overtime") if b.overtime_amount.to_d.positive?
    lines
  end

  def order_lines
    @source.order_items.map { |i| line(i.name, i.quantity, i.price, i.price.to_f * i.quantity, kind: "product") }
  end

  def gift_card_lines
    [ line("Gift card #{@source.code}", 1, @source.initial_balance, nil, kind: "gift_card") ]
  end

  def line(description, qty, unit_price, amount = nil, kind:)
    {
      "kind"        => kind,
      "description" => description.to_s,
      "quantity"    => qty,
      "unit_price"  => unit_price.to_f.round(2),
      "amount"      => (amount || unit_price).to_f.round(2)
    }
  end

  def client_type_label(booking)
    return if booking.client_type.blank? || booking.client_type == "adult"
    return "Group of #{booking.party_size}" if booking.client_type == "group"

    booking.client_type.to_s.humanize
  end

  # ── Snapshot ────────────────────────────────────────────────────────────────

  def details_for(user, gross)
    {
      "business" => business,
      "bill_to"  => bill_to(user),
      "payments" => payments,
      "amount_paid" => amount_paid.to_f.round(2),
      "balance_due" => balance_due(gross).to_f.round(2)
    }.merge(source_details).compact
  end

  def business
    BUSINESS.merge(
      "email"      => ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"),
      "address"    => Setting.get("invoice_business_address").presence,
      "hst_number" => Setting.get("invoice_hst_number").presence
    ).compact
  end

  def bill_to(user)
    {
      "name"  => [ user.first_name, user.last_name ].compact.join(" ").strip.presence || user.email,
      "email" => user.email,
      "phone" => user.phone.presence
    }.compact
  end

  def source_details
    case @source
    when Booking then booking_details
    when Order   then { "shipping_address" => address_hash(@source.shipping_address) }.compact
    else {}
    end
  end

  def booking_details
    b = @source
    zone = BusinessHours.zone
    starts = b.starts_at&.in_time_zone(zone)
    ends = b.ends_at&.in_time_zone(zone)
    tech = b.employee_profile

    {
      "booked_for" => booked_for(b),
      "service_address" => address_hash(b.address),
      "appointment" => {
        "reference"        => "BKG-#{b.id}",
        "service"          => b.service&.name,
        "category"         => b.service&.service_category&.name,
        "date"             => starts&.strftime("%A, %B %-d, %Y"),
        "start_time"       => starts&.strftime("%-l:%M %p"),
        "end_time"         => ends&.strftime("%-l:%M %p"),
        "duration_minutes" => (starts && ends ? ((ends - starts) / 60).round : nil),
        "timezone"         => starts&.strftime("%Z"),
        "technician"       => tech&.user&.first_name,
        "technician_title" => tech&.title,
        "client_type"      => b.client_type,
        "party_size"       => b.party_size,
        "status"           => b.status
      }.compact,
      "tip" => (b.tips.sum(:amount).to_f.round(2) if b.tips.any?)
    }.compact
  end

  # The person the appointment was for, when it isn't the account holder.
  def booked_for(booking)
    return if booking.booked_for_name.blank? && booking.booked_for_phone.blank?

    { "name" => booking.booked_for_name.presence, "phone" => booking.booked_for_phone.presence }.compact
  end

  def address_hash(address)
    return unless address

    {
      "line1"       => address.line1,
      "line2"       => address.try(:line2).presence,
      "city"        => address.city,
      "province"    => address.province,
      "postal_code" => address.postal_code,
      "buzz_code"   => address.try(:buzz_code).presence
    }.compact
  end

  # ── Payments ────────────────────────────────────────────────────────────────

  def paid_payments
    return Payment.none unless @source.respond_to?(:payments)

    @source.payments.where(status: "paid").order(:paid_at, :created_at)
  end

  def payments
    paid_payments.map do |p|
      {
        "date"      => p.paid_at&.in_time_zone(BusinessHours.zone)&.strftime("%b %-d, %Y"),
        "method"    => payment_method_name(p.method),
        "reference" => p.processor_ref.presence&.last(8),
        "amount"    => p.amount.to_f.round(2)
      }.compact
    end
  end

  def amount_paid = paid_payments.sum(:amount)

  # Orders and gift cards are only invoiced once paid; a booking can be invoiced
  # with money still owing (pay-after-service), and the invoice says so.
  def balance_due(gross)
    return 0.to_d unless @source.is_a?(Booking)

    [ gross.to_d - amount_paid, 0.to_d ].max
  end

  def last_paid_at = paid_payments.last&.paid_at

  PAYMENT_METHOD_NAMES = {
    "card" => "Card", "cash" => "Cash", "interac" => "Interac e-Transfer",
    "cheque" => "Cheque", "gift_card" => "Gift card"
  }.freeze

  def payment_method_name(method) = PAYMENT_METHOD_NAMES.fetch(method.to_s, method.to_s.humanize)

  def payment_method_label
    methods = paid_payments.filter_map(&:method).uniq
    return "card" if methods.empty? && !@source.is_a?(Booking)
    return if methods.empty?

    methods.map { |m| payment_method_name(m) }.join(" + ")
  end
end
