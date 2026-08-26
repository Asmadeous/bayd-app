require "rails_helper"

RSpec.describe AvailabilitySchedule, type: :model do
  it "is valid with a day, start, and end" do
    expect(build(:availability_schedule)).to be_valid
  end

  it "requires a day_of_week in 0..6" do
    expect(build(:availability_schedule, day_of_week: 7)).not_to be_valid
    expect(build(:availability_schedule, day_of_week: -1)).not_to be_valid
    expect(build(:availability_schedule, day_of_week: 0)).to be_valid
    expect(build(:availability_schedule, day_of_week: 6)).to be_valid
  end

  it "requires start_time and end_time" do
    expect(build(:availability_schedule, start_time: nil)).not_to be_valid
    expect(build(:availability_schedule, end_time: nil)).not_to be_valid
  end

  it "rejects end_time not after start_time" do
    expect(build(:availability_schedule, start_time: "12:00", end_time: "12:00")).not_to be_valid
    expect(build(:availability_schedule, start_time: "13:00", end_time: "12:00")).not_to be_valid
    expect(build(:availability_schedule, start_time: "09:00", end_time: "17:00")).to be_valid
  end

  it "allows multiple rows for the same tech and day (split shifts)" do
    tech = create(:employee_profile)
    create(:availability_schedule, employee_profile: tech, day_of_week: 1, start_time: "09:00", end_time: "12:00")
    second = build(:availability_schedule, employee_profile: tech, day_of_week: 1, start_time: "13:00", end_time: "17:00")
    expect(second).to be_valid
  end
end
