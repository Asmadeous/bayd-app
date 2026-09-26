require "rails_helper"

# A booking's invoice is issued (and emailed) at completion, usually before the
# tech takes payment. It must go out as UNPAID with the balance, and once the
# charge lands it must be re-issued as a paid receipt, same invoice number.
RSpec.describe InvoiceRefreshJob, type: :job do
  include ActiveJob::TestHelper

  let(:customer) { create(:user, email: "client@example.com", first_name: "Joshie") }
  let(:tech)     { create(:employee_profile) }
  let(:service)  { create(:service, duration_minutes: 60, price: 50) }
  let(:booking) do
    Booking.create!(user: customer, service: service, employee_profile: tech,
                    starts_at: 2.hours.ago, ends_at: 1.hour.ago, status: "completed",
                    subtotal: 50, travel_fee: 0, total: 50)
  end

  it "issues the completion invoice as unpaid with the full balance" do
    invoice = Invoice.generate_for(booking)

    expect(invoice).to be_status_issued
    expect(invoice.details["balance_due"]).to eq(50.0)
    mail = InvoiceMailer.invoice_email(invoice)
    expect(mail.subject).to eq("Invoice #{invoice.invoice_number} from Beauty @ Your Door: $50.00 due")
    expect(mail.html_part.body.to_s).to include("UNPAID")
  end

  it "re-issues the invoice as a paid receipt after a staff charge" do
    invoice = Invoice.generate_for(booking)
    number = invoice.reload.invoice_number

    expect {
      booking.mark_paid!(processor: "manual", method: "cash", amount: 50)
    }.to have_enqueued_job(described_class).with(booking.id)

    perform_enqueued_jobs(only: described_class)
    invoice.reload
    expect(invoice).to be_status_paid
    expect(invoice.invoice_number).to eq(number)
    expect(invoice.details["balance_due"]).to eq(0.0)
    expect(invoice.details["payments"].first).to include("method" => "Cash", "amount" => 50.0)
    expect(invoice.payment_method).to eq("Cash")
    expect(GenerateInvoiceJob).to have_been_enqueued.with(invoice.id).at_least(:once)

    mail = InvoiceMailer.invoice_email(invoice)
    expect(mail.subject).to eq("Paid receipt #{number} from Beauty @ Your Door")
    expect(mail.html_part.body.to_s).to include("PAID")
  end

  it "shows the remaining balance after a partial payment" do
    invoice = Invoice.generate_for(booking)
    booking.mark_paid!(processor: "manual", method: "interac", amount: 20)
    perform_enqueued_jobs(only: described_class)

    expect(invoice.reload).to be_status_issued
    expect(invoice.details["balance_due"]).to eq(30.0)
  end

  it "does nothing when the booking has no invoice yet" do
    expect { described_class.perform_now(booking.id) }.not_to change(Invoice, :count)
  end
end
