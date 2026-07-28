class ProductCategorySerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :description, :image_url, :position
end
