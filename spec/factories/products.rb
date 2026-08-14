FactoryBot.define do
  factory :product do
    sequence(:name) { |n| "Product #{n}" }
    price { 25.00 }
    active { true }
    stock_quantity { 10 }
    featured { false }
    # shipping_speed defaults to "fast" in the schema; leave it unless overridden.
  end
end
