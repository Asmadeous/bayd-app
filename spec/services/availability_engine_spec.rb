require "rails_helper"

RSpec.describe AvailabilityEngine, type: :service do
  let(:zone)    { BusinessHours.zone }
  let(:tech)    { create(:employee_profile, base_latitude: 43.65, base_longitude: -79.38) }
  let(:service) { create(:service, duration_minutes: 60) }
  # A Wednesday, comfortably in the future.
  let(:date)    { next_weekday(3) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def engine(**opts)
    described_class.new(employee: tech, service: service, date: date, **opts)
  end

  describe "weekly template" do
    it "returns no slots when the tech has no schedule for that day" do
      expect(engine.slots).to eq([])
    end

    it "offers 15-min-granularity slots inside the window, last visit finishing by end" do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday,
             start_time: "09:00", end_time: "11:00")
      # 60-min visit in a 09:00-11:00 window: starts at 9:00, 9:15, ... 10:00 (last
      # that finishes by 11:00). Nothing at 10:15 (would end 11:15).
      slots = engine.slots
      expect(slots.first).to eq("09:00")
      expect(slots).to include("10:00")
      expect(slots).not_to include("10:15")
      expect(slots.last).to eq("10:00")
    end

    it "supports split shifts (multiple rows for the day)" do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "10:00")
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "13:00", end_time: "14:00")
      slots = engine.slots
      expect(slots).to include("09:00", "13:00")
      expect(slots).not_to include("11:00")
    end
  end

  describe "overrides win over the template" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "17:00")
    end

    it "a blackout override yields no slots" do
      create(:availability_override, employee_profile: tech, date: date, available: false)
      expect(engine.slots).to eq([])
    end

    it "a partial-day override replaces the window entirely" do
      create(:availability_override, employee_profile: tech, date: date, available: true,
             start_time: "10:00", end_time: "12:00")
      slots = engine.slots
      expect(slots.first).to eq("10:00")
      expect(slots.last).to eq("11:00") # last 60-min visit finishing by 12:00
      expect(slots).not_to include("09:00")
    end

    it "an available override with no times falls back to the template" do
      create(:availability_override, employee_profile: tech, date: date, available: true)
      expect(engine.slots.first).to eq("09:00")
    end
  end

  describe "existing bookings block overlapping slots" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "13:00")
    end

    it "removes slots that overlap a confirmed booking" do
      booked_start = zone.local(date.year, date.month, date.day, 10, 0)
      Booking.create!(user: create(:user), service: service, employee_profile: tech,
                      starts_at: booked_start, ends_at: booked_start + 60.minutes,
                      status: "confirmed", subtotal: 1, travel_fee: 0, total: 1)
      slots = engine.slots
      # 10:00 booked (60 min) blocks a 60-min visit starting 9:15..10:45.
      expect(slots).to include("09:00")
      expect(slots).not_to include("09:30", "10:00", "10:30")
      expect(slots).to include("11:00")
    end
  end

  describe "party size scales the visit length" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "11:00")
    end

    it "a party of 2 needs a 120-min window, so only 09:00 fits a 60-min service" do
      slots = engine(party_size: 2).slots
      expect(slots).to eq([ "09:00" ]) # 09:00-11:00 exactly; nothing later fits
    end
  end

  describe "travel feasibility filters slots" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "13:00")
      # A far-away prior booking ending 09:45 near downtown; the candidate location
      # is far, so early slots are unreachable in time.
      prev_start = zone.local(date.year, date.month, date.day, 9, 0)
      Booking.create!(user: create(:user), service: service, employee_profile: tech,
                      starts_at: prev_start, ends_at: prev_start + 45.minutes,
                      status: "confirmed", subtotal: 1, travel_fee: 0, total: 1,
                      service_latitude: 43.90, service_longitude: -79.90)
    end

    it "drops slots the tech can't reach from the previous job" do
      # Customer far from the previous job (~50km) → needs long travel after 09:45.
      slots = engine(customer_lat: 43.20, customer_lng: -79.00).slots
      expect(slots).not_to include("09:45", "10:00")
    end

    it "offers slots when customer location is unknown (travel not judged)" do
      expect(engine.slots).to include("10:00")
    end
  end

  describe ".first_available_date" do
    it "finds the next date with a slot, skipping days with no schedule" do
      # Schedule only on the target weekday.
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "12:00")
      found = described_class.first_available_date(employee: tech, service: service, from: Date.current + 1)
      expect(found).to eq(date)
    end

    it "returns nil within the horizon when the tech never works" do
      found = described_class.first_available_date(employee: tech, service: service, from: Date.current + 1, horizon_days: 14)
      expect(found).to be_nil
    end
  end
end
