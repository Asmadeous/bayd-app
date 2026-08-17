# Can a technician physically get from their previous job to this appointment,
# and on to their next job, given driving time between locations? Shared by
# AssignmentService (the booking-time gate) and AvailabilityController (so the
# slot picker only offers slots the tech can actually reach) — one source of
# truth, so availability and booking never disagree.
class TravelFeasibility
  AVG_SPEED_KMH      = 35
  MIN_TURNAROUND_MIN = 15

  # employee     — EmployeeProfile
  # customer_lat/lng — the appointment location (nil → travel can't be judged →
  #                    feasible, we don't block on unknown location)
  # next_buffer_min  — extra margin to leave before the tech's NEXT job (dispatch
  #                    uses this for on-demand; scheduled bookings pass 0)
  def initialize(employee:, customer_lat:, customer_lng:, next_buffer_min: 0)
    @employee = employee
    @customer_lat = customer_lat
    @customer_lng = customer_lng
    @next_buffer_min = next_buffer_min
  end

  # True if the tech can reach [starts_at, ends_at) from their previous booking
  # and still reach their next one. Unknown customer location → true (not judged).
  def feasible?(starts_at, ends_at)
    return true if @customer_lat.nil? || @customer_lng.nil?

    reachable_from_previous?(starts_at) && reachable_to_next?(ends_at)
  end

  private

  def active_bookings
    @active_bookings ||= @employee.bookings.where(status: %w[confirmed in_progress])
  end

  def reachable_from_previous?(starts_at)
    prev_job = active_bookings.where("ends_at <= ?", starts_at).order(ends_at: :desc).first
    return true unless prev_job

    d = Geo.haversine_km(prev_job.service_latitude, prev_job.service_longitude, @customer_lat, @customer_lng)
    prev_job.ends_at + travel_minutes(d).minutes <= starts_at
  end

  def reachable_to_next?(ends_at)
    next_job = active_bookings.where("starts_at >= ?", ends_at).order(starts_at: :asc).first
    return true unless next_job

    d = Geo.haversine_km(@customer_lat, @customer_lng, next_job.service_latitude, next_job.service_longitude)
    ends_at + (travel_minutes(d) + @next_buffer_min).minutes <= next_job.starts_at
  end

  def travel_minutes(distance_km)
    return MIN_TURNAROUND_MIN if distance_km.nil? || !distance_km.finite?

    [ (distance_km / AVG_SPEED_KMH * 60).ceil, MIN_TURNAROUND_MIN ].max
  end
end
