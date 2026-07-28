class BookingRequestSerializer < Blueprinter::Base
  identifier :id
  fields :kind, :status, :requested_start, :requested_window_end,
         :customer_latitude, :customer_longitude, :client_type,
         :assigned_distance_km, :location_source, :created_at

  association :service, blueprint: ServiceSerializer
end
