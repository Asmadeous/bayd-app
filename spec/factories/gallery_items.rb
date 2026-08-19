FactoryBot.define do
  factory :gallery_item do
    sequence(:title) { |n| "Gallery item ##{n}" }
    category { "Nails" }
    size { "standard" }
    image_url { "https://example.com/default.jpg" }
    active { true }
  end
end
