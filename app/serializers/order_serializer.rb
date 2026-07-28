class OrderSerializer < Blueprinter::Base
  identifier :id
  fields :status, :total, :created_at

  association :order_items, blueprint: OrderItemSerializer
end
