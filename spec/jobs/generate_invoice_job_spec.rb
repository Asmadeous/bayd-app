require "rails_helper"

# Guards the post-purchase notification flow: once an order is paid, an invoice
# is generated and GenerateInvoiceJob must email BOTH the customer (confirmation
# + PDF) and the team (new-order heads-up so they can place the dropship order).
# This flow had zero coverage, which is how a mail misconfig went unnoticed.
RSpec.describe GenerateInvoiceJob, type: :job do
  let(:user)  { create(:user, email: "shopper@example.com") }
  let(:order) { create(:order, user: user, total: 42.00, status: "paid") }
  let(:invoice) do
    Invoice.create!(user: user, invoiceable: order, kind: "order",
                    subtotal: 42.00, tax: 0, total: 42.00, tax_rate: 0, currency: "CAD")
  end

  it "emails the customer their order confirmation" do
    expect(OrderMailer).to receive(:confirmation).with(invoice).and_call_original
    described_class.perform_now(invoice.id)
  end

  it "emails the team a new-order notification" do
    expect(OrderMailer).to receive(:admin_new_order).with(order).and_call_original
    described_class.perform_now(invoice.id)
  end

  it "attaches the rendered PDF to the invoice" do
    described_class.perform_now(invoice.id)
    expect(invoice.reload.pdf).to be_attached
  end

  it "does not send order emails for a gift-card invoice" do
    gc_invoice = Invoice.create!(user: user, kind: "gift_card",
                                 subtotal: 50, tax: 0, total: 50, tax_rate: 0, currency: "CAD")
    expect(OrderMailer).not_to receive(:confirmation)
    expect(OrderMailer).not_to receive(:admin_new_order)
    described_class.perform_now(gc_invoice.id)
  end
end
