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

  association :subcategories, blueprint: self
end
