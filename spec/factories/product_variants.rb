FactoryBot.define do
  factory :product_variant do
    product
    sequence(:label) { |n| "Style #{n}" }
    price { nil } # nil => falls back to product.price via effective_price
    active { true }
    stock_quantity { 5 }
  end
end
