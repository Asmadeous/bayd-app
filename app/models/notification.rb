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
    meeting_reminder_day_before: "meeting_reminder_day_before",
    meeting_reminder_soon: "meeting_reminder_soon",
    booking_follow_up: "booking_follow_up",
    booking_rescheduled: "booking_rescheduled",
    booking_cancelled: "booking_cancelled",
    booking_confirmed: "booking_confirmed",
    booking_reminder_day_before: "booking_reminder_day_before",
    booking_reminder_day_of: "booking_reminder_day_of",
    booking_dispatch: "booking_dispatch",
    booking_no_show: "booking_no_show",
    booking_starting: "booking_starting",           # tech nudge to clock in (at starts_at)
    booking_window_ended: "booking_window_ended",    # tech prompt to confirm completion (after ends_at)
    booking_overdue: "booking_overdue",              # tech/admin flag: past grace, no clock-in (sweep)
    support_message: "support_message",              # admin: a website visitor wrote in the support chat
    booking_missed: "booking_missed"                 # customer: tech missed, reschedule offered
  }, prefix: true

  validates :kind, :title, presence: true

  scope :unread, -> { where(read_at: nil) }
  scope :recent, -> { order(created_at: :desc) }

  def read? = read_at.present?

  def mark_read!
    update!(read_at: Time.current) unless read?
  end
end
