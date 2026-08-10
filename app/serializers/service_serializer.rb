class ServiceSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :duration_minutes, :price, :image_url,
         :requires_consultation, :active, :service_category_id, :simplybook_event_id, :kids_only

  field :category_name do |service, _opts|
    service.service_category&.name
  end

  # Technicians who perform this service (bookable ones only) — powers the
  # per-service staff picker.
  field :providers do |service, _opts|
    service.employee_profiles.select { |ep| ep.active? && ep.dispatchable? }.map do |ep|
      { id: ep.id, name: ep.user&.first_name, title: ep.title, photo_url: ep.photo_url }
    end
  end

  # { adult:, kids:, elderly:, group: } — per-client-type prices.
  field :prices do |service, _opts|
    service.prices
  end

  field :group_size do |_service, _opts|
    Service::GROUP_SIZE
  end
end
