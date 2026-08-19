class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :booking, optional: true

  # Notification categories the customer can receive.
  enum :kind, {
    review_request:  "review_request",
    rebook_nudge:    "rebook_nudge",
    referral_offer:  "referral_offer",
    recurring_booked: "recurring_booked",
    charge_failed:   "charge_failed",
    loyalty_earned:  "loyalty_earned",
    booking_redirected: "booking_redirected",
    meeting_scheduled: "meeting_scheduled",
    booking_follow_up: "booking_follow_up"
  }, prefix: true

  validates :kind, :title, presence: true

  scope :unread, -> { where(read_at: nil) }
  scope :recent, -> { order(created_at: :desc) }

  def read? = read_at.present?

  def mark_read!
    update!(read_at: Time.current) unless read?
  end
end
