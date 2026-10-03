class InvoiceMailer < ApplicationMailer
  def invoice_email(invoice)
    @invoice = invoice
    @user = invoice.user
    attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf.download if invoice.pdf.attached?

    franchise = invoice.franchise
    subject = if invoice.status_paid?
      "Paid receipt #{invoice.invoice_number} from #{franchise.display_name}"
    else
      "Invoice #{invoice.invoice_number} from #{franchise.display_name}: #{franchise.money(invoice.details&.dig("balance_due") || invoice.total)} due"
    end
    mail(to: invoice.user.email, subject: subject)
  end
end
