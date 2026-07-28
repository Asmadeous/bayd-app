class Shift < ApplicationRecord
  belongs_to :employee_profile

  enum :status, { open: "open", closed: "closed" }, prefix: true

  validates :clock_in_at, presence: true
  validates :clock_in_latitude, :clock_in_longitude, presence: true
  validate  :single_open_shift, on: :create

  scope :for_period, ->(from, to) { where(clock_in_at: from..to) }
  scope :recent,     -> { order(clock_in_at: :desc) }

  def self.fuel_rate_per_km
    ENV.fetch("FUEL_RATE_PER_KM", "0.68").to_f
  end

  def duration_seconds
    ((clock_out_at || Time.current) - clock_in_at).to_i
  end

  # Close the shift: stamp clock-out time/location, then compute travelled
  # distance and fuel reimbursement. Idempotent + row-locked.
  def close!(latitude:, longitude:, at: Time.current)
    with_lock do
      return self if status_closed?

      self.clock_out_at        = at
      self.clock_out_latitude  = latitude
      self.clock_out_longitude = longitude
      self.status              = "closed"
      self.fuel_rate_per_km    = self.class.fuel_rate_per_km
      self.distance_km         = MileageCalculator.for(self)
      self.fuel_reimbursement  = (distance_km * fuel_rate_per_km).round(2)
      save!
    end
    self
  end

  private

  def single_open_shift
    return unless status_open?
    return unless employee_profile_id

    open_scope = Shift.status_open.where(employee_profile_id: employee_profile_id)
    open_scope = open_scope.where.not(id: id) if persisted?
    errors.add(:base, "already clocked in") if open_scope.exists?
  end
end
