FactoryBot.define do
  factory :booking do
    user
    employee_profile
    service
    status { "confirmed" }
    starts_at { 2.days.from_now.change(hour: 14) }
    ends_at { starts_at + 1.hour }
    subtotal { 100 }
    total { 100 }
  end

  factory :visit do
    user
    starts_at { 2.days.from_now.change(hour: 14) }
    ends_at { starts_at + 2.hours }
  end
end
