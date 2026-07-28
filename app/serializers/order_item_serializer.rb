class OrderItemSerializer < Blueprinter::Base
  identifier :id
  fields :quantity, :price, :name, :product_id
end
