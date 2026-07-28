class ForumCategorySerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :description, :position
end
