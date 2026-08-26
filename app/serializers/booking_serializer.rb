class BookingSerializer < Blueprinter::Base
  identifier :id
  fields :status, :starts_at, :ends_at, :subtotal, :travel_fee, :total,
         :notes, :cancellation_reason, :created_at, :client_type, :party_size,
         :recurrence_active, :recurrence_interval_weeks, :auto_charge,
         :payment_timing, :payment_status, :deposit_amount,
         :booked_for_name, :booked_for_phone, :overtime_amount,
         :service_latitude, :service_longitude, :reschedule_count, :parent_booking_id

  field :outstanding_balance do |booking|
    booking.outstanding_balance
  end

  # Extra services the customer added to this visit. They are note-only (the same
  # tech does them back-to-back — NOT a separate booking), stored on raw["addons"]
  # as [{ id, name, price, duration }]. Empty when none.
  field :addons do |booking|
    booking.raw["addons"] || []
  end

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
