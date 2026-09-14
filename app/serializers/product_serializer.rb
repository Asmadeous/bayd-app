class ProductSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :sku, :price, :stock_quantity, :gallery_urls, :shipping_speed

  # Prefer an uploaded image; fall back to the legacy image_url string.
  field :image_url do |product|
    if product.image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(product.image)
    else
      product.image_url
    end
  end

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
