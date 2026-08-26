require "rails_helper"

RSpec.describe AvailabilityOverride, type: :model do
  it "is valid as a plain available override" do
    expect(build(:availability_override)).to be_valid
  end

  it "is valid as a full-day blackout with no times" do
    expect(build(:availability_override, :blackout)).to be_valid
  end

  it "is valid as a partial-day window" do
    o = build(:availability_override, :partial)
    expect(o).to be_valid
    expect(o.partial_day?).to be(true)
  end

  it "requires a date" do
    expect(build(:availability_override, date: nil)).not_to be_valid
  end

  it "allows only one override per tech per day" do
    tech = create(:employee_profile)
    create(:availability_override, employee_profile: tech, date: Date.current + 3)
    dup = build(:availability_override, employee_profile: tech, date: Date.current + 3)
    expect(dup).not_to be_valid
  end

  it "lets two different techs override the same date" do
    date = Date.current + 3
    create(:availability_override, employee_profile: create(:employee_profile), date: date)
    other = build(:availability_override, employee_profile: create(:employee_profile), date: date)
    expect(other).to be_valid
  end

  it "rejects a partial window whose end is not after start" do
    expect(build(:availability_override, available: true, start_time: "12:00", end_time: "12:00")).not_to be_valid
    expect(build(:availability_override, available: true, start_time: "15:00", end_time: "14:00")).not_to be_valid
  end
end
