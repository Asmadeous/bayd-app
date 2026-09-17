# Per-APPOINTMENT time clock. A tech clocks in on a specific booking when they
# arrive at the client, and clocks out when the job is done. Each clock-in opens
# a Shift tied to that booking; clock-out closes it (distance + fuel) and marks
# the booking completed. Rules:
#   - Geofence: clock-in is only allowed within GEOFENCE_M metres of the booking's
#     service location (the client's geocoded postal code).
#   - Grace: clocking in later than the scheduled start + GRACE_MIN stamps the
#     shift arrived_late (feeds the KPI/on-time report).
#   - One open shift per tech (DB unique index): can't clock into job B while A
#     is still open - clock out of A first.
class TimeClock
  Error = Class.new(StandardError)

  GEOFENCE_M = 150   # must be within 150 m of the client to clock in
  GRACE_MIN  = 15    # minutes after scheduled start before "late"

  def self.clock_in(employee_profile, booking:, latitude:, longitude:, accuracy_meters: nil, at: Time.current)
    raise Error, "already clocked in" if employee_profile.shifts.status_open.exists?
    raise Error, "not your booking" unless booking.employee_profile_id == employee_profile.id
    raise Error, "already clocked in for this booking" if booking.shifts.status_open.exists?

    within_geofence!(booking, latitude, longitude)

    shift = nil
    ActiveRecord::Base.transaction do
      shift = employee_profile.shifts.create!(
        booking: booking, status: "open", clock_in_at: at,
        clock_in_latitude: latitude, clock_in_longitude: longitude,
        arrived_late: late?(booking, at)
      )
      booking.update!(status: "in_progress") if booking.confirmed?
      employee_profile.update!(on_shift: true)
      record_location(employee_profile, latitude, longitude, accuracy_meters, at, "clock_in")
    end
    shift
  end

  def self.clock_out(employee_profile, booking:, latitude:, longitude:, accuracy_meters: nil, at: Time.current)
    shift = employee_profile.shifts.status_open.where(booking: booking).recent.first
    raise Error, "not clocked in for this booking" unless shift

    ActiveRecord::Base.transaction do
      shift.close!(latitude: latitude, longitude: longitude, at: at)
      booking.update!(status: "completed") if booking.in_progress?
      employee_profile.update!(on_shift: false)
      record_location(employee_profile, latitude, longitude, accuracy_meters, at, "clock_out")
    end
    shift
  end

  # Distance from the clock-in point to the client's service location, in metres.
  # Returns nil when the booking has no geocoded location (geofence not enforced).
  def self.distance_to_booking_m(booking, latitude, longitude)
    return nil if booking.service_latitude.nil? || booking.service_longitude.nil?

    km = Geo.haversine_km(latitude.to_f, longitude.to_f,
                          booking.service_latitude.to_f, booking.service_longitude.to_f)
    km&.finite? ? (km * 1000) : nil
  end

  def self.within_geofence!(booking, latitude, longitude)
    # Testing escape hatch: GEOFENCE_DISABLED=true lets a tech clock in from
    # anywhere (so QA can exercise clock-in without being at the client's address).
    # Default OFF - the 150 m gate is enforced in normal operation.
    return if ENV["GEOFENCE_DISABLED"] == "true"

    metres = distance_to_booking_m(booking, latitude, longitude)
    return if metres.nil? # unknown client location -> can't judge, don't block

    return if metres <= GEOFENCE_M

    raise Error, "You must be within #{GEOFENCE_M} m of the client to clock in (you're #{metres.round} m away)."
  end

  # Late = clocked in after the scheduled start plus the grace window.
  def self.late?(booking, at)
    return false unless booking.starts_at

    at > (booking.starts_at + GRACE_MIN.minutes)
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
