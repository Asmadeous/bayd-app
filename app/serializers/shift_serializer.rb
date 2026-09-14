class ShiftSerializer < Blueprinter::Base
  identifier :id
  fields :status, :clock_in_at, :clock_out_at,
         :clock_in_latitude, :clock_in_longitude,
         :clock_out_latitude, :clock_out_longitude,
         :distance_km, :fuel_reimbursement, :fuel_rate_per_km, :notes,
         :booking_id, :arrived_late

  field :duration_seconds

  association :employee_profile, blueprint: EmployeeProfileSerializer
end
