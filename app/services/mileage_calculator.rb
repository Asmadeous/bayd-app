# Computes the distance a tech travelled during a shift, for fuel compensation.
#
# Route = clock-in location → each job serviced during the shift (in order) →
# clock-out location. Leg distances are REAL ROAD distances (Google Directions
# via Directions.road_km) so the tech is paid for what they actually drove, not a
# straight-line under-estimate. If routing is unavailable for a leg, Directions
# falls back to straight-line so the leg is never dropped to zero. Legs with
# unknown coordinates are skipped rather than guessed.
class MileageCalculator
  SERVICED_STATUSES = %w[in_progress completed].freeze

  def self.for(shift)
    new(shift).distance_km
  end

  def initialize(shift)
    @shift = shift
  end

  # Total travelled ROAD distance in km, rounded to metres.
  def distance_km
    route_points.each_cons(2).sum do |a, b|
      leg = Directions.road_km(a[:lat], a[:lng], b[:lat], b[:lng])
      leg || 0.0
    end.round(3)
  end

  # Ordered stops with coordinates, for auditing / a route breakdown.
  def route_points
    points = []
    points << point(@shift.clock_in_latitude, @shift.clock_in_longitude, "clock_in")
    bookings_in_window.each { |b| points << booking_point(b) }
    points << point(@shift.clock_out_latitude, @shift.clock_out_longitude, "clock_out")
    points.compact
  end

  private

  def bookings_in_window
    upper = @shift.clock_out_at || Time.current
    @shift.employee_profile.bookings
          .where(status: SERVICED_STATUSES)
          .where(starts_at: @shift.clock_in_at..upper)
          .order(:starts_at)
  end

  def booking_point(booking)
    if booking.service_latitude && booking.service_longitude
      point(booking.service_latitude, booking.service_longitude, "booking_#{booking.id}")
    elsif booking.address&.latitude && booking.address&.longitude
      point(booking.address.latitude, booking.address.longitude, "booking_#{booking.id}")
    end
  end

  def point(lat, lng, label)
    return nil if lat.nil? || lng.nil?
    { lat: lat, lng: lng, label: label }
  end
end
