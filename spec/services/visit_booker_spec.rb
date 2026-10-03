require "rails_helper"

RSpec.describe VisitBooker do
  let(:zone) { BusinessHours.zone }
  let(:date) { next_weekday(3) }
  let(:user) { create(:user) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60, price: 80) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60, price: 50) }
  let(:address) do
    user.addresses.create!(line1: "1 King St W", city: "Toronto", province: "ON", postal_code: "M5V 2T6",
                           latitude: 43.65, longitude: -79.38)
  end

  before { allow_any_instance_of(Address).to receive(:geocode) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def at(hhmm) = zone.parse("#{date.iso8601} #{hhmm}")

  def tech(*services, fsas: [])
    ep = create(:employee_profile, base_latitude: 43.66, base_longitude: -79.39, dispatchable: true, service_fsas: fsas)
    services.each { |s| EmployeeService.create!(employee_profile: ep, service: s) }
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: "09:00", end_time: "17:00")
    ep
  end

  def book(**opts)
    described_class.new(user: user, services: [ lash, pedi ], starts_at: at("09:15"), address: address, **opts).call
  end

  it "creates one confirmed booking per service, back-to-back, each with its tech" do
    lasher = tech(lash)
    pedicurist = tech(pedi)

    result = book
    expect(result).to be_success
    visit = result.visit
    expect(visit.bookings.map { |b| [ b.service, b.employee_profile, b.visit_position, b.status ] })
      .to eq([ [ lash, lasher, 0, "confirmed" ], [ pedi, pedicurist, 1, "confirmed" ] ])
    expect(visit.bookings.first.ends_at).to eq(visit.bookings.last.starts_at)
    expect([ visit.starts_at, visit.ends_at ]).to eq([ at("09:15"), at("11:15") ])
    expect(visit.total).to eq(130)
  end

  it "gives the whole visit to one tech who does both" do
    both = tech(lash, pedi)
    expect(book.visit.bookings.map(&:employee_profile).uniq).to eq([ both ])
  end

  it "holds every line pending when the customer pays up front" do
    tech(lash, pedi)
    expect(book(payment_timing: "pay_upfront").visit.bookings.map(&:status).uniq).to eq([ "pending" ])
  end

  it "prices groups per person and holds them for the deposit" do
    tech(lash, pedi)
    visit = book(client_type: "group", party_size: 3).visit
    expect(visit.bookings.map(&:party_size).uniq).to eq([ 3 ])
    expect(visit.bookings.first.total).to eq(lash.price_for("group") * 3)
    expect(visit.bookings.map(&:status).uniq).to eq([ "pending" ])
  end

  it "refuses an address outside coverage" do
    tech(lash, pedi, fsas: [ "M4C" ])
    expect(book.error).to eq(:no_coverage)
    expect(Visit.count).to eq(0)
  end

  it "refuses times outside open hours" do
    tech(lash, pedi)
    result = described_class.new(user: user, services: [ lash, pedi ], starts_at: at("18:00"), address: address).call
    expect(result.error).to eq(:outside_hours)
  end

  it "reports no availability when a service can't be staffed" do
    tech(lash)
    expect(book.error).to eq(:no_availability)
    expect(Booking.count).to eq(0)
  end

  describe "when a tech's slot is taken between planning and booking" do
    it "re-plans without that tech and books the rest" do
      taken = tech(lash, pedi)
      backup = tech(lash, pedi)
      # The planner still believes `taken` is free (it planned before the race);
      # the real write then trips no_double_booking.
      create(:booking, employee_profile: taken, starts_at: at("09:00"), ends_at: at("12:00"))
      real = VisitPlanner.instance_method(:plan_at)
      allow_any_instance_of(VisitPlanner).to receive(:plan_at) do |planner, start, exclude_employee_ids: []|
        if exclude_employee_ids.empty?
          [ lash, pedi ].each_with_index.map do |s, i|
            VisitPlanner::Line.new(service: s, employee: taken, starts_at: start + (i * 60).minutes, ends_at: start + ((i + 1) * 60).minutes)
          end
        else
          real.bind_call(planner, start, exclude_employee_ids: exclude_employee_ids)
        end
      end

      result = book
      expect(result).to be_success
      expect(result.visit.bookings.map(&:employee_profile).uniq).to eq([ backup ])
      expect(Visit.count).to eq(1)
    end

    it "fails cleanly with slot_taken when nobody else is free" do
      taken = tech(lash, pedi)
      create(:booking, employee_profile: taken, starts_at: at("09:00"), ends_at: at("12:00"))
      allow_any_instance_of(VisitPlanner).to receive(:plan_at) do |_planner, start, exclude_employee_ids: []|
        next nil if exclude_employee_ids.any?

        [ VisitPlanner::Line.new(service: lash, employee: taken, starts_at: start, ends_at: start + 1.hour),
          VisitPlanner::Line.new(service: pedi, employee: taken, starts_at: start + 1.hour, ends_at: start + 2.hours) ]
      end

      expect(book.error).to eq(:slot_taken)
      expect(Visit.count).to eq(0)
    end
  end

  it "schedules reminders for confirmed lines only" do
    tech(lash, pedi)
    expect(BookingReminders).to receive(:schedule).twice
    book

    expect(BookingReminders).not_to receive(:schedule)
    described_class.new(user: user, services: [ lash, pedi ], starts_at: at("13:15"), address: address,
                        payment_timing: "pay_upfront").call
  end
end
