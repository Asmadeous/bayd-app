require "rails_helper"

RSpec.describe VisitPlanner do
  let(:zone) { BusinessHours.zone }
  let(:date) { next_weekday(3) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60) }
  let(:customer) { { customer_lat: 43.65, customer_lng: -79.38 } }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def at(hhmm) = zone.parse("#{date.iso8601} #{hhmm}")

  def tech(*services, lat: 43.66, lng: -79.39, from: "09:00", to: "17:00", fsas: [])
    ep = create(:employee_profile, base_latitude: lat, base_longitude: lng, dispatchable: true, service_fsas: fsas)
    services.each { |s| EmployeeService.create!(employee_profile: ep, service: s) }
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: from, end_time: to)
    ep
  end

  def book!(employee, from, to)
    create(:booking, employee_profile: employee, starts_at: at(from), ends_at: at(to))
  end

  def planner(services = [ lash, pedi ], **opts)
    described_class.new(services: services, date: date, **customer, **opts)
  end

  def summary(plan)
    plan.map { |l| [ l.service.name, l.employee.id, l.starts_at.in_time_zone(zone).strftime("%H:%M"), l.ends_at.in_time_zone(zone).strftime("%H:%M") ] }
  end

  it "gives the whole visit to one tech who does every service, back-to-back" do
    both = tech(lash, pedi)
    tech(pedi, lat: 43.65, lng: -79.38) # nearer, but can't do lashes

    plan = planner.plan_at(at("09:15"))
    expect(summary(plan)).to eq([ [ "Lash Lift", both.id, "09:15", "10:15" ], [ "Pedicure", both.id, "10:15", "11:15" ] ])
    expect(planner.single_tech?(plan)).to be(true)
  end

  it "splits across techs when nobody does every service" do
    lasher = tech(lash)
    pedicurist = tech(pedi)

    plan = planner.plan_at(at("09:15"))
    expect(summary(plan)).to eq([ [ "Lash Lift", lasher.id, "09:15", "10:15" ], [ "Pedicure", pedicurist.id, "10:15", "11:15" ] ])
  end

  it "keeps the customer's order of services" do
    lasher = tech(lash)
    pedicurist = tech(pedi)

    plan = planner([ pedi, lash ]).plan_at(at("09:15"))
    expect(summary(plan).map(&:first)).to eq([ "Pedicure", "Lash Lift" ])
    expect(plan.map { |l| l.employee.id }).to eq([ pedicurist.id, lasher.id ])
  end

  it "falls back to a split when the all-rounder is booked" do
    both = tech(lash, pedi)
    lasher = tech(lash)
    pedicurist = tech(pedi)
    book!(both, "09:00", "12:00")

    plan = planner.plan_at(at("09:15"))
    expect(plan.map { |l| l.employee.id }).to eq([ lasher.id, pedicurist.id ])
  end

  it "picks the nearest free tech for each service" do
    tech(lash, lat: 44.5, lng: -80.5)
    near = tech(lash, lat: 43.651, lng: -79.381)
    tech(pedi)

    expect(planner.plan_at(at("09:15")).first.employee).to eq(near)
  end

  it "needs the second tech free for their own slice of the visit" do
    tech(lash)
    pedicurist = tech(pedi)
    book!(pedicurist, "10:00", "11:00")

    expect(planner.plan_at(at("09:15"))).to be_nil
    expect(planner.plan_at(at("11:00"))&.last&.employee).to eq(pedicurist)
  end

  it "skips excluded techs (they just lost a race for this time)" do
    both = tech(lash, pedi)
    lasher = tech(lash)
    pedicurist = tech(pedi)

    plan = planner.plan_at(at("09:15"), exclude_employee_ids: [ both.id ])
    expect(plan.map { |l| l.employee.id }).to eq([ lasher.id, pedicurist.id ])
  end

  it "returns nil when a service has no tech" do
    tech(lash)
    expect(planner.plan_at(at("09:15"))).to be_nil
    expect(planner.slots).to eq({})
  end

  it "rejects times in the past and outside open hours" do
    tech(lash, pedi, from: "06:00", to: "23:00")
    expect(planner.plan_at(1.hour.ago)).to be_nil
    expect(planner.plan_at(at("18:00"))).to be_nil # would finish 20:00, after close
    expect(planner.plan_at(at("08:00"))).to be_nil # before open
  end

  it "scales each line by party size" do
    both = tech(lash, pedi)
    plan = planner(party_size: 2).plan_at(at("09:15"))
    expect(summary(plan)).to eq([ [ "Lash Lift", both.id, "09:15", "11:15" ], [ "Pedicure", both.id, "11:15", "13:15" ] ])
  end

  describe "coverage" do
    it "only uses techs who cover the customer's FSA" do
      tech(lash, pedi, fsas: [ "M4C" ])
      lasher = tech(lash, fsas: [ "M5V" ])
      pedicurist = tech(pedi, fsas: [ "M5V" ])

      plan = planner(postal_code: "M5V 2T6").plan_at(at("09:15"))
      expect(plan.map { |l| l.employee.id }).to eq([ lasher.id, pedicurist.id ])
    end

    it "fails closed at booking time when the postal code is unknown" do
      tech(lash, pedi, fsas: [ "M5V" ])
      expect(planner(postal_code: nil, strict_coverage: true).plan_at(at("09:15"))).to be_nil
      expect(planner(postal_code: nil).plan_at(at("09:15"))).to be_present
    end
  end

  describe "#slots" do
    it "lists every staffable start with its plan" do
      tech(lash, pedi, from: "09:00", to: "12:00")
      slots = planner.slots
      expect(slots.keys).to eq(%w[09:15])
      expect(slots["09:15"].size).to eq(2)
    end

    it "ignores the visit's own lines when re-planning it" do
      both = tech(lash, pedi, from: "09:00", to: "12:00")
      own = [ book!(both, "09:15", "10:15"), book!(both, "10:15", "11:15") ]

      expect(planner.slots).to eq({})
      expect(planner(ignore_booking_ids: own.map(&:id)).slots.keys).to eq(%w[09:15])
    end
  end

  describe ".first_available_date" do
    it "finds the next date the whole visit can be staffed" do
      tech(lash, pedi)
      found = described_class.first_available_date(from: date - 1, services: [ lash, pedi ], **customer)
      expect(found).to be <= date
    end
  end
end
