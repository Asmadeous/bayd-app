class AddRequestedEmployeeToBookingRequests < ActiveRecord::Migration[8.1]
  def change
    # The technician the customer picked (when the booking UI offers a choice).
    # AssignmentService restricts eligibility to this provider when present.
    add_reference :booking_requests, :requested_employee, null: true,
                  foreign_key: { to_table: :employee_profiles }
  end
end
