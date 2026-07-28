require "stringio"

# Renders the invoice PDF, attaches it to the Invoice via Active Storage, and
# emails it to the customer. Idempotent on the PDF (won't re-render if present).
class GenerateInvoiceJob < ApplicationJob
  queue_as :default

  def perform(invoice_id)
    invoice = Invoice.find_by(id: invoice_id)
    return unless invoice

    unless invoice.pdf.attached?
      pdf = InvoicePdf.new(invoice).render
      invoice.pdf.attach(
        io: StringIO.new(pdf),
        filename: "#{invoice.invoice_number}.pdf",
        content_type: "application/pdf"
      )
    end

    deliver_emails(invoice)
  rescue StandardError => e
    Rails.logger.error("[GenerateInvoiceJob] invoice #{invoice_id}: #{e.class}: #{e.message}")
  end

  private

  # One confirmation email per kind (invoice PDF attached). Gift-card *code*
  # delivery is a separate email triggered on the gift card itself.
  def deliver_emails(invoice)
    case invoice.kind
    when "order"
      OrderMailer.confirmation(invoice).deliver_later
      OrderMailer.admin_new_order(invoice.invoiceable).deliver_later if invoice.invoiceable
    when "gift_card"
      GiftCardMailer.purchase(invoice).deliver_later
    else
      InvoiceMailer.invoice_email(invoice).deliver_later
    end
  end
end
