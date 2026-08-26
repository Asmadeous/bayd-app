class AvailabilityOverrideSerializer < Blueprinter::Base
  identifier :id
  fields :employee_profile_id, :date, :available, :start_time, :end_time
end
