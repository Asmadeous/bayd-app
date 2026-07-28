class AssignmentAttempt < ApplicationRecord
  belongs_to :booking_request
  belongs_to :chosen_employee, class_name: "EmployeeProfile", optional: true

  # `candidates` is an audit log of who was considered; an empty list is valid
  # (it records that no eligible tech was found). Column is NOT NULL default {}.
end
