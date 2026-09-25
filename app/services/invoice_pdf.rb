require "prawn"
require "prawn/table"

# Renders an Invoice to a PDF byte string using Prawn. Everything printed comes
# from the invoice itself (line items + the `details` snapshot), so a reprint
# always matches what was issued. Invoices issued before `details` existed fall
# back to the account holder and the stored totals.
class InvoicePdf
  BRAND  = "c96c83"
  INK    = "101217"
  MUTED  = "5f6268"
  RULE   = "e6e2dc"
  WASH   = "f7f3ee"
  LOGO   = Rails.root.join("app/assets/images/invoice-logo.png")

  def initialize(invoice)
    @invoice = invoice
    @d = invoice.details || {}
  end

  def render
    Prawn::Document.new(page_size: "LETTER", margin: [ 40, 44, 64, 44 ], info: { Title: @invoice.invoice_number }) do |pdf|
      @pdf = pdf
      header
      status_banner
      parties
      appointment if @d["appointment"]
      items
      totals
      payments if Array(@d["payments"]).any?
      notes
      footer
      page_numbers
    end.render
  end

  private

  attr_reader :pdf

  # ── Header: business on the left, invoice identity on the right ────────────
  def header
    biz = business
    top = pdf.cursor
    pdf.bounding_box([ 0, top ], width: 300) do
      if File.exist?(LOGO)
        pdf.image LOGO.to_s, height: 44
        pdf.move_down 6
      else
        text biz["name"], size: 18, style: :bold
      end
      text biz["name"], size: 11, style: :bold if File.exist?(LOGO)
      muted [ biz["tagline"], biz["address"], biz["phone"], biz["email"], biz["website"] ]
      muted [ "GST/HST #{biz['hst_number']}" ] if biz["hst_number"]
    end
    header_bottom = pdf.cursor

    pdf.bounding_box([ pdf.bounds.width - 220, top ], width: 220) do
      text "INVOICE", size: 24, style: :bold, color: BRAND, align: :right
      pdf.move_down 4
      kv_right("Invoice no.", @invoice.invoice_number)
      kv_right("Issued", @invoice.issued_at&.in_time_zone(BusinessHours.zone)&.strftime("%b %-d, %Y"))
      kv_right("Booking ref.", @d.dig("appointment", "reference"))
      kv_right("Due", paid? ? "Paid" : "On receipt")
    end

    pdf.move_cursor_to [ header_bottom, pdf.cursor ].min
    pdf.move_down 14
    rule
  end

  def status_banner
    label, color = if @invoice.status_void? then [ "VOID", MUTED ]
    elsif @invoice.status_refunded? then [ "REFUNDED", MUTED ]
    elsif paid? then [ "PAID IN FULL#{paid_on}", "3f7e47" ]
    else [ "BALANCE DUE #{money(balance_due)}", BRAND ]
    end
    pdf.move_down 10
    text label, size: 10, style: :bold, color: color
    pdf.move_down 10
  end

  # ── Bill to / appointment for / service address ────────────────────────────
  def parties
    cols = []
    cols << [ "BILL TO", contact_lines(bill_to) ]
    if (bf = @d["booked_for"])
      cols << [ "APPOINTMENT FOR", [ bf["name"], bf["phone"] ].compact ]
    end
    if (addr = @d["service_address"] || @d["shipping_address"])
      cols << [ @d["service_address"] ? "SERVICE ADDRESS" : "SHIP TO", address_lines(addr) ]
    end
    columns(cols)
  end

  def appointment
    a = @d["appointment"]
    time = [ a["start_time"], a["end_time"] ].compact.join(" - ")
    time = "#{time} #{a['timezone']}" if a["timezone"] && time.present?
    rows = [
      [ "Date", a["date"] ],
      [ "Time", time.presence ],
      [ "Duration", a["duration_minutes"] && "#{a['duration_minutes']} min" ],
      [ "Service", [ a["service"], a["category"] && "(#{a['category']})" ].compact.join(" ") ],
      [ "Technician", [ a["technician"], a["technician_title"] ].compact.join(" - ").presence ],
      [ "Client", client_label(a) ],
      [ "Status", a["status"]&.tr("_", " ")&.capitalize ]
    ].select { |_, v| v.present? }

    section_title("APPOINTMENT")
    pdf.table(rows, width: pdf.bounds.width, column_widths: [ 90 ],
              cell_style: { size: 9, borders: [], padding: [ 2, 6, 2, 0 ], text_color: INK }) do |t|
      t.column(0).text_color = MUTED
      t.column(0).font_style = :bold
    end
    pdf.move_down 14
  end

  # ── Line items ─────────────────────────────────────────────────────────────
  def items
    section_title("DETAILS")
    rows = [ [ "Description", "Qty", "Rate", "Amount" ] ]
    @invoice.line_items.each do |li|
      rows << [ li["description"], qty(li["quantity"]), money(li["unit_price"]), money(li["amount"]) ]
    end

    pdf.table(rows, width: pdf.bounds.width, header: true, column_widths: { 1 => 44, 2 => 80, 3 => 84 },
              cell_style: { size: 9, borders: [ :bottom ], border_color: RULE, padding: [ 7, 6, 7, 6 ], text_color: INK }) do |t|
      t.row(0).background_color = WASH
      t.row(0).font_style = :bold
      t.row(0).text_color = MUTED
      t.row(0).size = 8
      t.columns(1..3).align = :right
    end
    pdf.move_down 12
  end

  def totals
    rows = [
      [ "Subtotal (before tax)", money(@invoice.subtotal) ],
      [ tax_label, money(@invoice.tax) ],
      [ "Total #{@invoice.currency}", money(@invoice.total) ]
    ]
    rows << [ "Tip (not taxed)", money(@d["tip"]) ] if @d["tip"].to_f.positive?
    if @d.key?("amount_paid")
      rows << [ "Amount paid", "-#{money(@d['amount_paid'])}" ]
      rows << [ "Balance due", money(balance_due) ]
    end
    total_row = 2
    balance_row = rows.size - 1 if @d.key?("amount_paid")

    pdf.bounding_box([ pdf.bounds.width - 240, pdf.cursor ], width: 240) do
      pdf.table(rows, width: 240, cell_style: { size: 10, borders: [], padding: [ 3, 6 ], text_color: INK }) do |t|
        t.columns(1).align = :right
        t.column(0).text_color = MUTED
        t.row(total_row).font_style = :bold
        t.row(total_row).borders = [ :top ]
        t.row(total_row).border_color = RULE
        if balance_row
          t.row(balance_row).font_style = :bold
          t.row(balance_row).text_color = paid? ? "3f7e47" : BRAND
          t.row(balance_row).size = 12
        end
      end
    end
    pdf.move_down 18
  end

  def payments
    section_title("PAYMENTS")
    rows = [ [ "Date", "Method", "Reference", "Amount" ] ]
    @d["payments"].each do |p|
      rows << [ p["date"].to_s, p["method"].to_s, p["reference"] ? "...#{p['reference']}" : "-", money(p["amount"]) ]
    end
    pdf.table(rows, width: pdf.bounds.width, column_widths: { 3 => 84 },
              cell_style: { size: 9, borders: [ :bottom ], border_color: RULE, padding: [ 5, 6 ], text_color: INK }) do |t|
      t.row(0).font_style = :bold
      t.row(0).text_color = MUTED
      t.row(0).size = 8
      t.column(3).align = :right
    end
    pdf.move_down 14
  end

  def notes
    return if @invoice.notes.blank?

    section_title("NOTES")
    text @invoice.notes, size: 9
    pdf.move_down 12
  end

  # Pinned inside the bottom margin of every page, so it never spills onto a
  # page of its own.
  def footer
    biz = business
    lines = [ "Prices include #{tax_name} where applicable. Thank you for choosing #{biz['name']}.",
              "Questions about this invoice? #{[ biz['email'], biz['phone'] ].compact.join(' - ')}" ]
    pdf.repeat(:all) do
      pdf.bounding_box([ 0, -12 ], width: pdf.bounds.width, height: 40) do
        rule
        pdf.move_down 6
        muted lines
      end
    end
  end

  def page_numbers
    return if pdf.page_count < 2

    pdf.number_pages "Page <page> of <total>", at: [ pdf.bounds.width - 100, -14 ], width: 100, align: :right, size: 8, color: MUTED
  end

  # ── Helpers ────────────────────────────────────────────────────────────────

  def business
    { "name" => InvoiceBuilder::BUSINESS["name"], "email" => ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca") }
      .merge(@d["business"] || {})
  end

  def bill_to
    return @d["bill_to"] if @d["bill_to"]

    u = @invoice.user
    { "name" => [ u&.first_name, u&.last_name ].compact.join(" ").strip.presence || u&.email, "email" => u&.email, "phone" => u&.phone }
  end

  def contact_lines(c) = [ c["name"], c["email"], c["phone"] ].compact_blank

  def address_lines(a)
    [
      a["line1"], a["line2"],
      [ a["city"], a["province"], a["postal_code"] ].compact_blank.join(", "),
      a["buzz_code"] && "Buzz code: #{a['buzz_code']}"
    ].compact_blank
  end

  def client_label(a)
    return "Group of #{a['party_size']}" if a["client_type"] == "group"
    return a["client_type"].to_s.capitalize if a["client_type"].present? && a["client_type"] != "adult"

    nil
  end

  def columns(cols)
    return if cols.empty?

    width = pdf.bounds.width / cols.size
    top = pdf.cursor
    bottoms = cols.each_with_index.map do |(title, lines), i|
      pdf.bounding_box([ i * width, top ], width: width - 12) do
        text title, size: 8, style: :bold, color: MUTED
        pdf.move_down 3
        lines.each_with_index { |l, j| text l, size: j.zero? ? 10 : 9, style: (j.zero? ? :bold : :normal) }
      end
      pdf.cursor
    end
    pdf.move_cursor_to bottoms.min
    pdf.move_down 16
  end

  def section_title(title)
    text title, size: 8, style: :bold, color: MUTED
    pdf.move_down 4
  end

  def kv_right(label, value)
    return if value.blank?

    pdf.formatted_text [ { text: "#{label}  ", color: MUTED, size: 9 }, { text: value.to_s, color: INK, size: 9, styles: [ :bold ] } ], align: :right
  end

  def text(str, size: 10, style: :normal, color: INK, align: :left)
    pdf.fill_color color
    pdf.text str.to_s, size: size, style: style, align: align
    pdf.fill_color INK
  end

  def muted(lines)
    lines.compact_blank.each { |l| text l, size: 9, color: MUTED }
  end

  def rule
    pdf.stroke_color RULE
    pdf.stroke_horizontal_rule
  end

  def paid? = @invoice.status_paid? || (@d.key?("balance_due") && @d["balance_due"].to_f <= 0)

  def balance_due = @d["balance_due"].to_f

  def paid_on
    date = @invoice.paid_at&.in_time_zone(BusinessHours.zone)&.strftime("%b %-d, %Y")
    date ? " - #{date}" : ""
  end

  def tax_name = @invoice.tax_rate.to_f.positive? ? "HST (#{(@invoice.tax_rate.to_f * 100).round}%)" : "tax"

  def tax_label
    @invoice.tax_rate.to_f.positive? ? "#{tax_name}, included" : "Tax"
  end

  def qty(value)
    value.to_f == value.to_i ? value.to_i.to_s : value.to_s
  end

  def money(amount)
    format("$%.2f", amount.to_f)
  end
end
