class ProductVariantSerializer < Blueprinter::Base
  identifier :id
  fields :label, :color_name, :color_hex, :image_url, :sku, :stock_quantity

  field :price do |variant, _opts|
    variant.effective_price
  end

  field :in_stock do |variant, _opts|
    variant.stock_quantity.positive?
  end
end
