require "prawn"
require "prawn/table"

# Renders an Invoice to a PDF byte string using Prawn.
class InvoicePdf
  BRAND   = "#c96c83"
  INK     = "101217"
  MUTED   = "5f6268"
  COMPANY = "Beauty @ Your Door"

  def initialize(invoice)
    @invoice = invoice
  end

  def render
    Prawn::Document.new(page_size: "A4", margin: 40) do |pdf|
      header(pdf)
      parties(pdf)
      items(pdf)
      totals(pdf)
      footer(pdf)
    end.render
  end

  private

  def header(pdf)
    pdf.fill_color INK
    pdf.text COMPANY, size: 20, style: :bold
    pdf.fill_color MUTED
    pdf.text "Mobile beauty services", size: 9
    pdf.move_up 34
    pdf.fill_color BRAND.delete("#")
    pdf.text "INVOICE", size: 20, style: :bold, align: :right
    pdf.fill_color MUTED
    pdf.text @invoice.invoice_number, size: 10, align: :right
    pdf.text "Issued #{@invoice.issued_at&.strftime('%b %-d, %Y')}", size: 9, align: :right
    pdf.fill_color "000000"
    pdf.move_down 20
    pdf.stroke_color "dddddd"
    pdf.stroke_horizontal_rule
    pdf.move_down 16
  end

  def parties(pdf)
    u = @invoice.user
    name = [ u&.first_name, u&.last_name ].compact.join(" ").strip
    pdf.fill_color MUTED
    pdf.text "BILL TO", size: 8, style: :bold
    pdf.fill_color INK
    pdf.text name.presence || u&.email.to_s, size: 11, style: :bold
    pdf.fill_color MUTED
    pdf.text u&.email.to_s, size: 9
    pdf.text "Status: #{@invoice.status.upcase} · #{@invoice.payment_method&.titleize}", size: 9
    pdf.fill_color "000000"
    pdf.move_down 16
  end

  def items(pdf)
    rows = [ %w[Description Qty Unit Amount] ]
    @invoice.line_items.each do |li|
      rows << [
        li["description"],
        li["quantity"].to_s,
        money(li["unit_price"]),
        money(li["amount"])
      ]
    end

    pdf.table(rows, width: pdf.bounds.width, cell_style: { size: 9, borders: [ :bottom ], border_color: "eeeeee", padding: [ 6, 6, 6, 0 ] }) do |t|
      t.row(0).font_style = :bold
      t.row(0).text_color = MUTED
      t.columns(1..3).align = :right
    end
    pdf.move_down 14
  end

  def totals(pdf)
    rows = [
      [ "Subtotal", money(@invoice.subtotal) ],
      [ "HST (#{(@invoice.tax_rate.to_f * 100).round}%)", money(@invoice.tax) ],
      [ "Total #{@invoice.currency}", money(@invoice.total) ]
    ]
    pdf.bounding_box([ pdf.bounds.width - 200, pdf.cursor ], width: 200) do
      pdf.table(rows, width: 200, cell_style: { size: 10, borders: [], padding: [ 3, 4 ] }) do |t|
        t.columns(1).align = :right
        t.row(2).font_style = :bold
        t.row(2).text_color = BRAND.delete("#")
      end
    end
    pdf.move_down 30
  end

  def footer(pdf)
    pdf.fill_color MUTED
    pdf.text "Thank you for choosing #{COMPANY}.", size: 9
    pdf.text "Questions? #{ENV.fetch('SUPPORT_EMAIL', 'Bookings@baydspa.ca')}", size: 8
    pdf.fill_color "000000"
  end

  def money(amount)
    format("$%.2f", amount.to_f)
  end
end
