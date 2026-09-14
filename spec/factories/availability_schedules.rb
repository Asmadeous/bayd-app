FactoryBot.define do
  factory :availability_schedule do
    employee_profile
    day_of_week { 1 } # Monday
    start_time  { "09:00" }
    end_time    { "17:00" }
  end
end
