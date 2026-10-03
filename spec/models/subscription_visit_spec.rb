require "rails_helper"

RSpec.describe Subscription, "for a multi-service visit" do
  let(:zone) { BusinessHours.zone }
  let(:customer) { create(:user, first_name: "Ada") }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60, price: 80) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60, price: 50) }
  let(:address) do
    customer.addresses.create!(line1: "1 King St W", city: "Toronto", province: "ON", postal_code: "M5V 2T6",
                               latitude: 43.65, longitude: -79.38)
  end
  let(:first_day) { next_weekday(3) }

  before do
    allow_any_instance_of(Address).to receive(:geocode)
    [ lash, pedi ].each do |svc|
      ep = create(:employee_profile, dispatchable: true, base_latitude: 43.66, base_longitude: -79.39)
      EmployeeService.create!(employee_profile: ep, service: svc)
      (0..6).each { |d| create(:availability_schedule, employee_profile: ep, day_of_week: d, start_time: "09:00", end_time: "17:00") }
    end
  end

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def first_visit
    VisitBooker.new(user: customer, services: [ lash, pedi ], address: address,
                    starts_at: zone.parse("#{first_day.iso8601} 09:15")).call.visit
  end

  it "starts from a visit and remembers every service" do
    visit = first_visit
    sub = described_class.start_from_visit(visit, interval_unit: "week", interval_count: 2, auto_charge: false)

    expect(sub.service_ids).to eq([ lash.id, pedi.id ])
    expect(sub.price).to eq(130)
    expect(sub.next_run_at).to eq(visit.starts_at + 2.weeks)
    expect(visit.bookings.reload.map(&:subscription_id).uniq).to eq([ sub.id ])
    expect(SubscriptionSerializer.render_as_hash(sub)[:service_name]).to eq("Lash Lift + Pedicure")
  end

  it "books the whole visit again each cycle" do
    sub = described_class.start_from_visit(first_visit, interval_unit: "week", interval_count: 1, auto_charge: false)

    visit = sub.generate_next_booking!

    expect(visit).to be_a(Visit)
    expect(visit.bookings.map(&:service)).to eq([ lash, pedi ])
    expect(visit.starts_at).to eq(zone.parse("#{(first_day + 7).iso8601} 09:15"))
    expect(visit.bookings.map(&:subscription_id).uniq).to eq([ sub.id ])
    expect(sub.reload.next_run_at).to eq(visit.starts_at + 1.week)
  end

  it "charges the visit once when auto-charging, and cancels it all if the card fails" do
    customer.update!(square_customer_id: "C", square_card_id: "K")
    sub = described_class.start_from_visit(first_visit, interval_unit: "week", interval_count: 1, auto_charge: true)

    allow(SquareService).to receive(:charge_card).and_return(success: true, payment_id: "P")
    paid = sub.generate_next_booking!
    expect(SquareService).to have_received(:charge_card).once.with(hash_including(amount_cents: 13_000))
    expect(paid.reload.outstanding_balance).to eq(0)

    allow(SquareService).to receive(:charge_card).and_return(success: false, error: "declined")
    failed = sub.reload.generate_next_booking!
    expect(failed.reload.status).to eq("cancelled")
    expect(customer.notifications.where(kind: "charge_failed").count).to eq(1)
  end
end
