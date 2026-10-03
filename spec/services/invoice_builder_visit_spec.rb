require "rails_helper"

RSpec.describe "Visit invoices" do
  let(:customer) { create(:user, first_name: "Ada") }
  let(:dana) { create(:employee_profile, user: create(:user, first_name: "Dana")) }
  let(:susi) { create(:employee_profile, user: create(:user, first_name: "Susi")) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60) }
  let(:start) { 2.days.from_now.change(hour: 14) }
  let(:visit) { create(:visit, user: customer, starts_at: start, ends_at: start + 2.hours) }
  let!(:first_line) { line(0, lash, dana, 80) }
  let!(:second_line) { line(1, pedi, susi, 50) }

  def line(position, service, tech, total)
    create(:booking, user: customer, visit: visit, visit_position: position, service: service, employee_profile: tech,
           starts_at: start + position.hours, ends_at: start + (position + 1).hours, subtotal: total, total: total)
  end

  it "bills every performed line on one invoice, naming each tech" do
    first_line.update_columns(status: "completed")
    second_line.update_columns(status: "completed")
    first_line.payments.create!(amount: 80, status: "paid", method: "card", processor: "square", paid_at: Time.current)

    invoice = InvoiceBuilder.new(visit.reload).build

    expect(invoice.invoiceable).to eq(visit)
    expect(invoice.total).to eq(130)
    expect(invoice.line_items.map { |l| l["description"] }).to eq([ "Lash Lift · 60 min · with Dana", "Pedicure · 60 min · with Susi" ])
    expect(invoice.details["balance_due"]).to eq(50.0)
    expect(invoice.details.dig("appointment", "reference")).to eq("VST-#{visit.id}")
    expect(invoice.details.dig("appointment", "technician")).to eq("Dana, Susi")
  end

  it "leaves a cancelled line off the bill" do
    first_line.update_columns(status: "completed")
    second_line.update_columns(status: "cancelled")

    invoice = InvoiceBuilder.new(visit.reload).build
    expect(invoice.total).to eq(80)
    expect(invoice.line_items.size).to eq(1)
  end

  describe "issuing" do
    before { allow(GenerateInvoiceJob).to receive(:perform_later) }

    it "waits for the last line, then issues exactly one invoice" do
      first_line.update!(status: "completed")
      BookingCompletedJob.perform_now(first_line.id)
      expect(Invoice.count).to eq(0)

      second_line.update!(status: "completed")
      BookingCompletedJob.perform_now(second_line.id)
      BookingCompletedJob.perform_now(second_line.id)
      expect(Invoice.where(invoiceable: visit).count).to eq(1)
    end

    it "issues when the last line ends some other way" do
      first_line.update!(status: "completed")
      BookingCompletedJob.perform_now(first_line.id)
      second_line.update!(status: "cancelled")
      expect(Invoice.where(invoiceable: visit).count).to eq(1)
    end

    it "refreshes the visit invoice when money lands on a line" do
      [ first_line, second_line ].each { |b| b.update_columns(status: "completed") }
      invoice = Invoice.generate_for(visit.reload)
      second_line.payments.create!(amount: 50, status: "paid", method: "cash", paid_at: Time.current)

      InvoiceRefreshJob.perform_now(second_line.id)
      expect(invoice.reload.details["amount_paid"]).to eq(50.0)
    end
  end
end
