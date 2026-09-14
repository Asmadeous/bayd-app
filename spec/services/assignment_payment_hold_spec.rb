require "rails_helper"

# A booking that involves an upfront payment must be created PENDING and only be
# confirmed once the payment webhook lands (Booking#refresh_payment_status!).
# Only a pure pay-after booking (nothing owed now) confirms immediately.
RSpec.describe AssignmentService, "payment hold on booking creation" do
  let(:zone)     { BusinessHours.zone }
  let(:service)  { create(:service, duration_minutes: 60, price: 100) }
  let(:customer) { create(:user) }
  let(:address) do
    customer.addresses.create!(line1: "1 Main St", city: "Mississauga", province: "ON",
                               postal_code: "L5L 2E9", latitude: 43.55, longitude: -79.70)
  end

  # An eligible tech: performs the service, covers the FSA, has a wide schedule,
  # based near the customer so travel is fine.
  let!(:tech) do
    ep = create(:employee_profile, base_latitude: 43.55, base_longitude: -79.70,
                                   service_fsas: [ "L5L" ], active: true, dispatchable: true)
    EmployeeService.create!(employee_profile: ep, service: service)
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday,
           start_time: "08:00", end_time: "20:00")
    ep
  end

  let(:date) { next_weekday(3) }

  def next_weekday(wday)
    d = Date.current + 7
    d += 1 until d.wday == wday
    d
  end

  def build_request(client_type: "adult")
    create(:booking_request, user: customer, service: service, address: address, client_type: client_type,
           customer_latitude: 43.55, customer_longitude: -79.70,
           requested_start: zone.local(date.year, date.month, date.day, 10, 0))
  end

  it "holds a pay-upfront booking as pending (awaits payment confirmation)" do
    result = described_class.new(build_request, payment_timing: "pay_upfront").call
    expect(result.success?).to be(true)
    expect(result.booking_request.booking.status).to eq("pending")
  end

  it "confirms a pay-after booking immediately (nothing owed up front)" do
    result = described_class.new(build_request, payment_timing: "pay_after").call
    expect(result.success?).to be(true)
    expect(result.booking_request.booking.status).to eq("confirmed")
  end

  it "holds a group booking as pending regardless of timing (deposit owed)" do
    result = described_class.new(build_request(client_type: "group"), payment_timing: "pay_after").call
    expect(result.success?).to be(true)
    expect(result.booking_request.booking.status).to eq("pending")
  end
end
