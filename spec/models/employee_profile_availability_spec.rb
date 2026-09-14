require "rails_helper"

# available_at? now gates on the tech's bookable hours (schedule/override) AND
# no booking overlap — so what the AvailabilityEngine offers is exactly what the
# booking path will accept.
RSpec.describe EmployeeProfile, "#available_at?", type: :model do
  let(:zone) { BusinessHours.zone }
  let(:tech) { create(:employee_profile) }
  let(:date) { next_weekday(3) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def at(hour, min = 0)
    zone.local(date.year, date.month, date.day, hour, min)
  end

  it "is false with no schedule for the day" do
    expect(tech.available_at?(at(10), at(11))).to be(false)
  end

  context "with a 09:00-17:00 template that day" do
    before { create(:availability_schedule, employee_profile: tech, day_of_week: date.wday, start_time: "09:00", end_time: "17:00") }

    it "is true for a visit inside the window" do
      expect(tech.available_at?(at(10), at(11))).to be(true)
    end

    it "is false for a visit that runs past the window end" do
      expect(tech.available_at?(at(16, 30), at(17, 30))).to be(false)
    end

    it "is false when a confirmed booking overlaps" do
      Booking.create!(user: create(:user), service: create(:service), employee_profile: tech,
                      starts_at: at(10), ends_at: at(11), status: "confirmed", subtotal: 1, travel_fee: 0, total: 1)
      expect(tech.available_at?(at(10, 30), at(11, 30))).to be(false)
      expect(tech.available_at?(at(11), at(12))).to be(true) # back-to-back is fine
    end

    it "is false on a blackout override for the date" do
      create(:availability_override, employee_profile: tech, date: date, available: false)
      expect(tech.available_at?(at(10), at(11))).to be(false)
    end

    it "respects a partial-day override window" do
      create(:availability_override, employee_profile: tech, date: date, available: true, start_time: "13:00", end_time: "15:00")
      expect(tech.available_at?(at(10), at(11))).to be(false) # outside override
      expect(tech.available_at?(at(13), at(14))).to be(true)  # inside override
    end
  end
end
