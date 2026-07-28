class ServiceAreaSerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :travel_fee, :active,
         :center_latitude, :center_longitude, :radius_meters,
         :postal_codes

  field :postal_code_count do |area|
    area.postal_codes.size
  end
end
