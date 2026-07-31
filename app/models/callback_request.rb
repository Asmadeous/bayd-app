# A request from a customer whose postal code has no covering technician.
# Instead of a hard rejection, we capture the enquiry so staff can call back,
# check for a closer tech, and (if agreed) book + charge a negotiated amount
# via an admin payment link. The automatic FSA travel-fee logic does NOT apply
# to these — the fee is negotiated by phone.
class CallbackRequest < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :service, optional: true

  STATUSES = %w[new contacted booked declined].freeze
  validates :status, inclusion: { in: STATUSES }

  scope :open, -> { where(status: %w[new contacted]) }
end
