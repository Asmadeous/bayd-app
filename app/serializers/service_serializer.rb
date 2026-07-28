class ServiceSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :duration_minutes, :price, :image_url,
         :requires_consultation, :active, :service_category_id, :simplybook_event_id

  field :category_name do |service, _opts|
    service.service_category&.name
  end

  # { adult:, kids:, elderly:, group: } — per-client-type prices.
  field :prices do |service, _opts|
    service.prices
  end

  field :group_size do |_service, _opts|
    Service::GROUP_SIZE
  end
end
