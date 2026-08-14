FactoryBot.define do
  factory :order_item do
    order
    product
    quantity { 1 }
    # price + name are auto-populated by OrderItem#snapshot_product on create.
  end
end
