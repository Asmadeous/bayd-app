# Staff time-clock. Clocking in/out opens/closes a Shift, flips the on_shift
# flag the dispatcher reads, and records the GPS fix into the live-location
# system (EmployeeCurrentLocation + a LocationPing) so the two stay consistent.
class TimeClock
  Error = Class.new(StandardError)

  def self.clock_in(employee_profile, latitude:, longitude:, accuracy_meters: nil, at: Time.current)
    raise Error, "already clocked in" if employee_profile.shifts.status_open.exists?

    shift = nil
    ActiveRecord::Base.transaction do
      shift = employee_profile.shifts.create!(
        status: "open", clock_in_at: at,
        clock_in_latitude: latitude, clock_in_longitude: longitude
      )
      employee_profile.update!(on_shift: true)
      record_location(employee_profile, latitude, longitude, accuracy_meters, at, "clock_in")
    end
    shift
  end

  def self.clock_out(employee_profile, latitude:, longitude:, accuracy_meters: nil, at: Time.current)
    shift = employee_profile.shifts.status_open.recent.first
    raise Error, "not clocked in" unless shift

    ActiveRecord::Base.transaction do
      shift.close!(latitude: latitude, longitude: longitude, at: at)
      employee_profile.update!(on_shift: false)
      record_location(employee_profile, latitude, longitude, accuracy_meters, at, "clock_out")
    end
    shift
  end

  def self.record_location(employee_profile, latitude, longitude, accuracy_meters, at, source)
    loc = EmployeeCurrentLocation.find_or_initialize_by(employee_profile_id: employee_profile.id)
    loc.update!(latitude: latitude, longitude: longitude, accuracy_meters: accuracy_meters, recorded_at: at)

    LocationPing.create!(
      employee_profile: employee_profile,
      latitude: latitude, longitude: longitude,
      accuracy_meters: accuracy_meters, recorded_at: at, source: source
    )
  end
  private_class_method :record_location
end
