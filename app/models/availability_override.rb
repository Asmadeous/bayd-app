# A date-specific exception to a technician's weekly template. It WINS over the
# weekly AvailabilitySchedule for its date (the winning logic lives in the
# AvailabilityEngine, 1b). One row per (tech, date).
#
# - available=false -> full blackout for the day (vacation/sick); times not needed.
# - available=true  -> extra or replacement hours that day; start_time/end_time set
#   a partial-day window. Times are time-of-day in the company zone, not UTC.
class AvailabilityOverride < ApplicationRecord
  belongs_to :employee_profile

  validates :date, presence: true
  validates :date, uniqueness: { scope: :employee_profile_id }
  validate  :end_after_start

  scope :for_date, ->(date) { where(date: date) }

  # A partial-day window is only meaningful when both times are set.
  def partial_day?
    available? && start_time.present? && end_time.present?
  end

  private

  # If both times are given, end must be after start. A blackout (or an all-day
  # available override) may omit them.
  def end_after_start
    return if start_time.blank? || end_time.blank?

    errors.add(:end_time, "must be after start time") if end_time <= start_time
  end
end
