class GiftCardMailer < ApplicationMailer
  # Purchase confirmation + invoice in a single email (PDF attached) → buyer.
  def purchase(invoice)
    @invoice = invoice
    @gift_card = invoice.invoiceable
    @user = invoice.user
    return unless @gift_card

    attachments["#{invoice.invoice_number}.pdf"] = invoice.pdf.download if invoice.pdf.attached?
    mail(to: @user.email, subject: "Gift card purchase confirmed — #{invoice.invoice_number}")
  end

  # Credential delivery (second email) → recipient (or buyer): the designed card
  # with the redeemable code.
  def delivery(gift_card)
    @gift_card = gift_card
    to = gift_card.recipient_email.presence || gift_card.purchaser&.email
    return if to.blank?

    gift_card.update_column(:delivered_at, Time.current)
    mail(to: to, subject: "🎁 You've received a Beauty at Your Door gift card")
  end
end
