# Brings a booking's (or its visit's) already-issued invoice up to date after a payment: new
# payment lines and balance, "paid" once nothing is owing, a fresh PDF, and the
# updated copy emailed to the customer (a paid receipt, or the new balance).
# No invoice yet means nothing to do: it's issued at completion with the
# payments already on it.
class InvoiceRefreshJob < ApplicationJob
  queue_as :default

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    invoice = booking && (Invoice.find_by(invoiceable: booking) || (booking.visit && Invoice.find_by(invoiceable: booking.visit)))
    return unless invoice

    InvoiceBuilder.new(invoice.invoiceable).refresh(invoice)
    invoice.pdf.purge if invoice.pdf.attached?
    GenerateInvoiceJob.perform_later(invoice.id)
  end
end
