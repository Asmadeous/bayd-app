class ProductSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :sku, :price, :stock_quantity, :image_url

  field :category do |product, _opts|
    product.product_category&.name
  end
end
