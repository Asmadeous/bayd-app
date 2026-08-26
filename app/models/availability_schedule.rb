# A technician's recurring weekly bookable-hours template: "Susi is bookable
# Mondays 9:00-17:00". The AvailabilityEngine (1b) computes free slots from these
# minus bookings and travel. Times are time-of-day in the company zone
# (BusinessHours), not UTC. Multiple rows per (tech, day) express split shifts.
class AvailabilitySchedule < ApplicationRecord
  belongs_to :employee_profile

  validates :day_of_week, presence: true, inclusion: { in: 0..6 }
  validates :start_time, :end_time, presence: true
  validate  :end_after_start

  scope :for_day, ->(dow) { where(day_of_week: dow) }

  private

  def end_after_start
    return if start_time.blank? || end_time.blank?

    errors.add(:end_time, "must be after start time") if end_time <= start_time
  end
end
