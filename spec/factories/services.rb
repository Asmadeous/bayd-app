FactoryBot.define do
  factory :service_category do
    sequence(:name) { |n| "Category #{n}" }
    sequence(:slug) { |n| "category-#{n}" }
  end

  factory :service do
    service_category
    sequence(:name) { |n| "Service #{n}" }
    duration_minutes { 60 }
    price { 100.00 }
  end
end
