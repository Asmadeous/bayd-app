class AvailabilityScheduleSerializer < Blueprinter::Base
  identifier :id
  fields :employee_profile_id, :day_of_week, :start_time, :end_time
end
