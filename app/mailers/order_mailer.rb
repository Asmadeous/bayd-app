class OrderMailer < ApplicationMailer
  # Order confirmation + invoice in a single email (PDF attached).
  def confirmation(invoice)
    @invoice = invoice
    @order = invoice.invoiceable
    @user = invoice.user
    return unless @order

    attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf.download if invoice.pdf.attached?
    mail(to: @user.email, subject: "Order confirmed — #{invoice.invoice_number}")
  end

  # Shipping / dispatch notification (second email), sent when the order ships.
  def dispatched(order)
    @order = order
    @user = order.user
    mail(to: @user.email, subject: "Your Beauty @ Your Door order is on its way 📦")
  end

  # Internal heads-up to the team on every new product order.
  def admin_new_order(order)
    @order = order
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "support@baydspa.ca"))
    mail(to: to, subject: format("New product order ##%d — $%.2f", order.id, order.total))
  end
end
