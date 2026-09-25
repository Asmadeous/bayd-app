require "rails_helper"

# A booking invoice itemises the service, each add-on, travel and overtime (which
# add up to the booking total) and snapshots every detail it prints: client,
# service address, appointment date/time, technician, and each payment.
RSpec.describe InvoiceBuilder do
  let(:zone)     { BusinessHours.zone }
  let(:customer) { create(:user, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", phone: "+14165550100") }
  let(:tech_user) { create(:user, first_name: "Rim", email: "rim-invoice@baydspa.ca", role: :employee) }
  let(:tech)     { create(:employee_profile, user: tech_user, title: "Medical Aesthetician") }
  let(:service)  { create(:service, name: "Deep facial", duration_minutes: 75, price: 135) }
  let(:address) do
    Address.create!(user: customer, line1: "12 King St W", line2: "Unit 4", city: "Toronto",
                    province: "ON", postal_code: "M5H 1A1", buzz_code: "0412")
  end
  let(:starts) { zone.local(2026, 10, 14, 14, 0) }

  def booking(payments: [])
    b = Booking.create!(
      user: customer, employee_profile: tech, service: service, address: address,
      status: "completed", client_type: "adult", party_size: 1,
      starts_at: starts, ends_at: starts + 105.minutes,
      subtotal: 185, travel_fee: 20, overtime_amount: 15, total: 220,
      raw: { "addons" => [ { "id" => 9, "name" => "Microdermabrasion", "price" => "50.0", "duration" => 30 } ] }
    )
    payments.each { |attrs| b.payments.create!(status: "paid", paid_at: starts + 2.hours, **attrs) }
    b
  end

  it "itemises service, add-on, travel, and overtime, summing to the total" do
    invoice = described_class.new(booking(payments: [ { amount: 220, method: "card", processor_ref: "sq_abcdef123456" } ])).build

    expect(invoice.line_items.map { |l| [ l["kind"], l["amount"] ] })
      .to eq([ [ "service", 135.0 ], [ "addon", 50.0 ], [ "travel", 20.0 ], [ "overtime", 15.0 ] ])
    expect(invoice.line_items.sum { |l| l["amount"] }).to eq(invoice.total.to_f)
    expect(invoice.line_items.first["description"]).to eq("Deep facial · 75 min")
    expect(invoice.subtotal + invoice.tax).to eq(invoice.total)
  end

  it "snapshots the client, address, appointment, technician, and payments" do
    invoice = described_class.new(booking(payments: [ { amount: 220, method: "cash" } ])).build
    d = invoice.details

    expect(d["bill_to"]).to eq("name" => "Ada Lovelace", "email" => "ada@example.com", "phone" => "+14165550100")
    expect(d["service_address"]).to include("line1" => "12 King St W", "line2" => "Unit 4", "postal_code" => "M5H 1A1", "buzz_code" => "0412")
    expect(d["appointment"]).to include(
      "reference" => "BKG-#{invoice.invoiceable_id}", "service" => "Deep facial",
      "date" => "Wednesday, October 14, 2026", "start_time" => "2:00 PM", "end_time" => "3:45 PM",
      "duration_minutes" => 105, "technician" => "Rim", "technician_title" => "Medical Aesthetician"
    )
    expect(d["payments"]).to eq([ { "date" => "Oct 14, 2026", "method" => "Cash", "amount" => 220.0 } ])
    expect(d["business"]).to include("name" => "Beauty @ Your Door", "phone" => "+1 (647) 970-8259")
    expect(invoice.payment_method).to eq("Cash")
  end

  it "prints the HST number once an admin sets it" do
    Setting.set("invoice_hst_number", "123456789 RT0001")
    invoice = described_class.new(booking).build
    expect(invoice.details.dig("business", "hst_number")).to eq("123456789 RT0001")
  end

  it "leaves an unpaid booking issued with the balance due" do
    invoice = described_class.new(booking(payments: [ { amount: 100, method: "interac" } ])).build

    expect(invoice).to be_status_issued
    expect(invoice.paid_at).to be_nil
    expect(invoice.details).to include("amount_paid" => 100.0, "balance_due" => 120.0)
  end

  it "renders a PDF with the new sections" do
    invoice = described_class.new(booking(payments: [ { amount: 220, method: "card" } ])).build
    pdf = InvoicePdf.new(invoice).render
    expect(pdf).to start_with("%PDF")
  end

  it "puts the appointment and itemised totals in the invoice email" do
    invoice = described_class.new(booking(payments: [ { amount: 220, method: "card" } ])).build
    body = InvoiceMailer.invoice_email(invoice).html_part.body.to_s

    expect(body).to include("Deep facial", "Wednesday, October 14, 2026", "2:00 PM - 3:45 PM", "Rim",
                            "12 King St W", "Add-on: Microdermabrasion", "Balance due")
  end

  it "still renders an old invoice issued without details" do
    old = Invoice.create!(user: customer, kind: "booking", subtotal: 88.5, tax: 11.5, total: 100,
                          tax_rate: 0.13, currency: "CAD", status: "paid", payment_method: "card",
                          line_items: [ { "description" => "Manicure", "quantity" => 1, "unit_price" => 100, "amount" => 100 } ])
    expect(InvoicePdf.new(old).render).to start_with("%PDF")
  end
end
