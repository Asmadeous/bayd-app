class InvoiceSerializer < Blueprinter::Base
  identifier :id
  fields :invoice_number, :status, :kind, :subtotal, :tax, :total, :tax_rate,
         :currency, :payment_method, :line_items, :details, :notes, :issued_at, :paid_at, :created_at

  field :source_label do |inv|
    { "booking" => "Booking", "order" => "Product order", "gift_card" => "Gift card", "manual" => "Manual" }[inv.kind] || "Invoice"
  end

  field :has_pdf do |inv|
    inv.pdf.attached?
  end

  field :customer do |inv|
    {
      id: inv.user_id,
      name: [ inv.user&.first_name, inv.user&.last_name ].compact.join(" ").strip.presence || inv.user&.email,
      email: inv.user&.email
    }
  end
end
