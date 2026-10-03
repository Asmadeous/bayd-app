require "rails_helper"

# A UK-style franchise, configured only with data: its own zone, hours,
# currency, tax, staff domain and postal prefixes.
RSpec.describe "A non-Canada franchise" do
  let(:uk) { create(:franchise, slug: "uk", open_hour: 8, close_hour: 20) }
  let(:london) { ActiveSupport::TimeZone["Europe/London"] }

  around { |ex| Current.set(franchise: uk) { ex.run } }
  before { allow_any_instance_of(Address).to receive(:geocode) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  it "uses the franchise's zone and hours" do
    expect(BusinessHours.zone.name).to eq("Europe/London")
    day = next_weekday(3)
    expect(BusinessHours.open_for?(london.parse("#{day} 08:00"), london.parse("#{day} 09:00"))).to be(true)
    expect(BusinessHours.open_for?(london.parse("#{day} 19:30"), london.parse("#{day} 20:30"))).to be(false)
  end

  it "matches coverage on any country's postal prefixes" do
    expect(PostalCode.normalize_area_list("sw1a, M1  e14")).to eq(%w[SW1A M1 E14])
    tech = create(:employee_profile, service_fsas: [ "SW1A", "M1" ])
    expect(tech.serves_postal?("SW1A 1AA")).to be(true)
    expect(tech.serves_postal?("M1 1AE")).to be(true)
    expect(tech.serves_postal?("E14 5AB")).to be(false)
  end

  it "covers by radius around the tech's base" do
    tech = create(:employee_profile, base_latitude: 51.5074, base_longitude: -0.1278, service_radius_km: 10)
    expect(tech.serves_location?(postal_code: nil, latitude: 51.52, longitude: -0.10)).to be(true)
    expect(tech.serves_location?(postal_code: nil, latitude: 52.2, longitude: 0.12)).to be(false)
    expect(EmployeeProfile.covers?("ZZ1", latitude: 51.52, longitude: -0.10)).to be(true)
  end

  it "books a visit in London time" do
    svc = create(:service, duration_minutes: 60, price: 40)
    tech = create(:employee_profile, service_fsas: [ "SW1A" ], dispatchable: true, base_latitude: 51.50, base_longitude: -0.14)
    EmployeeService.create!(employee_profile: tech, service: svc)
    day = next_weekday(3)
    create(:availability_schedule, employee_profile: tech, day_of_week: day.wday, start_time: "08:00", end_time: "12:00")
    customer = create(:user)
    address = customer.addresses.create!(line1: "10 Downing St", city: "London", province: "LND",
                                         postal_code: "SW1A 2AA", latitude: 51.5034, longitude: -0.1276)

    result = VisitBooker.new(user: customer, services: [ svc ], address: address,
                             starts_at: BusinessHours.parse_local("#{day}T08:15:00")).call

    expect(result).to be_success
    expect(result.visit.franchise).to eq(uk)
    expect(result.visit.bookings.first.starts_at.in_time_zone(london).strftime("%H:%M")).to eq("08:15")
  end

  it "invoices in the franchise's currency and tax" do
    booking = create(:booking, status: "completed", subtotal: 120, total: 120)
    invoice = InvoiceBuilder.new(booking).build
    expect(invoice.currency).to eq("GBP")
    expect(invoice.tax).to eq(20.0) # 120 includes 20% VAT
    expect(invoice.details.dig("business", "tax_name")).to eq("VAT")
    expect(uk.money(1234.5)).to eq("£1,234.50")
  end

  it "requires the franchise's staff email domain" do
    expect(build(:user, role: :employee, email: "ann@baydspa.ca")).not_to be_valid
    expect(build(:user, role: :employee, email: "ann@bayd.co.uk")).to be_valid
  end

  it "prints unknown currencies by code and whole-unit currencies without decimals" do
    expect(build(:franchise, currency: "XYZ").money(10)).to eq("XYZ 10.00")
    expect(build(:franchise, currency: "JPY").money(1500)).to eq("¥1,500")
    expect(build(:franchise, currency: "JPY").minor_units(1500)).to eq(1500)
    expect(uk.minor_units(12.34)).to eq(1234)
  end
end
