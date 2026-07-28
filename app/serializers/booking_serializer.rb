class BookingSerializer < Blueprinter::Base
  identifier :id
  fields :status, :starts_at, :ends_at, :subtotal, :travel_fee, :total,
         :notes, :cancellation_reason, :created_at, :client_type,
         :recurrence_active, :recurrence_interval_weeks, :auto_charge

  field :has_review do |booking|
    booking.review.present?
  end

  # Whether to surface the work-scope video call (special-needs / first-timers).
  field :meeting_recommended do |booking|
    booking.meeting_recommended?
  end

  association :service,          blueprint: ServiceSerializer
  association :employee_profile, blueprint: EmployeeProfileSerializer
  association :meeting,          blueprint: MeetingSerializer
end
