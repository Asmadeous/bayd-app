FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "customer#{n}@example.com" }
    first_name { "Jane" }
    last_name  { "Doe" }
    phone      { "+15550001111" }
  end
end
