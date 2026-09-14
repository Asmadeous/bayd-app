FactoryBot.define do
  factory :availability_override do
    employee_profile
    date       { Date.current + 7 }
    available  { true }

    # A full-day blackout (vacation/sick).
    trait :blackout do
      available  { false }
      start_time { nil }
      end_time   { nil }
    end

    # A partial-day available window.
    trait :partial do
      available  { true }
      start_time { "10:00" }
      end_time   { "14:00" }
    end
  end
end
