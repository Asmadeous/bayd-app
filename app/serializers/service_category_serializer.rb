class ServiceCategorySerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :position

  association :services, blueprint: ServiceSerializer
end
