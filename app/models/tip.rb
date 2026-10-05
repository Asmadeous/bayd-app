# A tip for the technician on a booking. Card tips are collected by the business
# (via Square) and therefore OWED to the tech — tracked here for payout. Cash
# tips are logged for the record only (the tech already has the money).
class Tip < ApplicationRecord
  belongs_to :booking
  belongs_to :employee_profile

  METHODS  = %w[card cash].freeze
  STATUSES = %w[collected paid_out].freeze

  validates :amount, numericality: { greater_than: 0 }
  validates :method, inclusion: { in: METHODS }
  validates :status, inclusion: { in: STATUSES }

  # Card tips still owed to the technician (money the business is holding).
  # Only counts tips on bookings that were actually paid — so an abandoned
  # payment link never produces a phantom payout.
  scope :owed_to_tech, lambda {
    where(status: "collected", method: "card")
      .joins(:booking).where(bookings: { payment_status: %w[paid deposit_paid] })
  }

  def mark_paid_out!
    update!(status: "paid_out", paid_out_at: Time.current)
  end
end
