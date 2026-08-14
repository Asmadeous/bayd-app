class ProductSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :sku, :price, :stock_quantity, :image_url, :gallery_urls, :shipping_speed

  field :category do |product, _opts|
    cat = product.product_category
    (cat&.parent || cat)&.name
  end

  field :has_variants do |product, _opts|
    product.has_variants?
  end

  association :variants, blueprint: ProductVariantSerializer do |product, _opts|
    scope = product.product_variants
    (scope.loaded? ? scope.select(&:active) : scope.active).sort_by(&:position)
  end
end
