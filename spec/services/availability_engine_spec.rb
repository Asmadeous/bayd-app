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

    it "steps slots by visit duration PLUS the travel floor, so consecutive slots are never back-to-back" do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday,
             start_time: "09:00", end_time: "13:00")
      # 60-min visit in a 09:00-13:00 window. First start 09:15 (15-min travel
      # floor off the 09:00 opening); each next start steps by 60 + 15 = 75 min so
      # the tech has turnaround between jobs: 09:15 (ends 10:15), 10:30 (ends
      # 11:30), 11:45 (ends 12:45). 13:00 would end 14:00 > 13:00, so it stops.
      slots = engine.slots
      expect(slots).to eq(%w[09:15 10:30 11:45])
    end

    it "supports split shifts (multiple rows for the day)" do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "11:00")
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "13:00", end_time: "15:00")
      slots = engine.slots
      # Each 2-hour window fits one 60-min visit after the 15-min offset: 09:15 and 13:15.
      expect(slots).to include("09:15", "13:15")
      expect(slots).not_to include("11:00", "15:00")
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
             start_time: "10:00", end_time: "13:00")
      slots = engine.slots
      # 10:00 opening + 15-min floor -> first 10:15; step 60 + 15 = 75 -> 10:15
      # (ends 11:15), 11:30 (ends 12:30). 12:45 would end 13:45 > 13:00.
      expect(slots).to eq(%w[10:15 11:30])
      expect(slots).not_to include("09:15")
    end

    it "an available override with no times falls back to the template" do
      create(:availability_override, employee_profile: tech, date: date, available: true)
      expect(engine.slots.first).to eq("09:15")
    end
  end

  describe "existing bookings block overlapping slots" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "13:00")
    end

    it "removes slots that overlap a confirmed booking" do
      booked_start = zone.local(date.year, date.month, date.day, 10, 15)
      Booking.create!(user: create(:user), service: service, employee_profile: tech,
                      starts_at: booked_start, ends_at: booked_start + 60.minutes,
                      status: "confirmed", subtotal: 1, travel_fee: 0, total: 1)
      slots = engine.slots
      # Grid is 09:15, 10:30, 11:45 in a 09:00-13:00 window (60-min visit + 15-min
      # travel step). The 10:15-11:15 booking overlaps 10:30 (10:30-11:30) -> removed.
      # 09:15 (ends 10:15, abuts) stays; 11:45 (after the booking) stays.
      expect(slots).to include("09:15")
      expect(slots).not_to include("10:30")
      expect(slots).to include("11:45")
    end
  end

  describe "party size scales the visit length" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "12:00")
    end

    it "a party of 2 needs a 120-min window, so only 09:15 fits a 60-min service" do
      slots = engine(party_size: 2).slots
      # 09:15 + 120 min = 11:15 (<=12:00). Next start 11:15 would end 13:15. Only one.
      expect(slots).to eq([ "09:15" ])
    end
  end

  describe "travel feasibility filters slots" do
    before do
      create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "13:00")
      # A far-away prior booking ending 10:15; the candidate location is far, so the
      # next slot (10:30) is unreachable in time. Grid is 09:15, 10:30, 11:45 (60-min
      # visit + 15-min travel step). The prior booking (09:00-10:15) removes 09:15
      # by overlap regardless of travel.
      prev_start = zone.local(date.year, date.month, date.day, 9, 0)
      Booking.create!(user: create(:user), service: service, employee_profile: tech,
                      starts_at: prev_start, ends_at: prev_start + 75.minutes,
                      status: "confirmed", subtotal: 1, travel_fee: 0, total: 1,
                      service_latitude: 43.90, service_longitude: -79.90)
    end

    it "drops slots the tech can't reach from the previous job" do
      # Customer far from the previous job → travel after 10:15 exceeds the 15-min
      # gap to 10:30, so 10:30 is unreachable; 11:45 (90 min later) is reachable.
      slots = engine(customer_lat: 43.75, customer_lng: -79.75).slots
      expect(slots).not_to include("10:30")
      expect(slots).to include("11:45")
    end

    it "offers slots when customer location is unknown (travel not judged)" do
      expect(engine.slots).to include("10:30")
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
