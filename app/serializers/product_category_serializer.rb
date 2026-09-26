class ProductCategorySerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :description, :position, :parent_id

  # Prefer an uploaded image; fall back to the legacy image_url string.
  field :image_url do |category|
    if category.image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(category.image)
    else
      category.image_url
    end
  end

  # Products on sale here, subcategories included (the shop hides empty chips).
  # Counted from the preloaded associations the index includes.
  field :product_count do |category|
    sellable = ->(cat) { cat.products.count { |p| p.active && p.stock_quantity.to_i.positive? } }
    sellable.call(category) + category.subcategories.sum { |sub| sellable.call(sub) }
  end

  association :subcategories, blueprint: self
end
