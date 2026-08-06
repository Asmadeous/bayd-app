class InvoiceMailer < ApplicationMailer
  def invoice_email(invoice)
    @invoice = invoice
    @user = invoice.user
    attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf.download if invoice.pdf.attached?

    mail(to: invoice.user.email, subject: "Your invoice #{invoice.invoice_number} from Beauty @ Your Door")
  end
end
