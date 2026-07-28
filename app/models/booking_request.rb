class BookingRequest < ApplicationRecord
  belongs_to :user
  belongs_to :service
  belongs_to :address, optional: true
  belongs_to :assigned_employee, class_name: "EmployeeProfile", optional: true

  has_many :assignment_attempts, dependent: :destroy
  has_one  :booking, dependent: :nullify

  enum :kind,   { on_demand: "on_demand", scheduled: "scheduled" }
  enum :status, {
    pending:         "pending",
    assigned:        "assigned",
    booked:          "booked",
    no_coverage:     "no_coverage",
    no_availability: "no_availability",
    failed:          "failed"
  }
  enum :location_source, { live: "live", base: "base" }, prefix: true
  enum :client_type, { adult: "adult", kids: "kids", elderly: "elderly", group: "group" }, prefix: true

  validates :kind, presence: true
  validates :customer_latitude, :customer_longitude, presence: true, if: :on_demand?
  validates :requested_start, :address, presence: true, if: :scheduled?
end
