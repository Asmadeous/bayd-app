# When a technician's app reports a new location, push it to the customer(s)
# whose booking that tech is currently heading to. "Currently heading to" = the
# tech's next active booking today that hasn't started yet. ETA is a straight-line
# estimate (distance / AVG_SPEED), matching the scheduler's travel model.
class TripBroadcaster
  AVG_SPEED_KMH = TravelFeasibility::AVG_SPEED_KMH

  def self.call(employee_profile:, latitude:, longitude:)
    booking = upcoming_booking_for(employee_profile)
    return unless booking&.service_latitude && booking&.service_longitude

    eta = eta_minutes(latitude, longitude, booking.service_latitude, booking.service_longitude)
    TripChannel.broadcast_position(booking, latitude: latitude, longitude: longitude, eta_minutes: eta)
  end

  # The tech's next appointment that's active and not finished — the one a customer
  # would be watching for arrival. Nearest upcoming start wins.
  def self.upcoming_booking_for(employee_profile)
    employee_profile.bookings
                    .where(status: %w[confirmed in_progress])
                    .where("ends_at > ?", Time.current)
                    .order(:starts_at)
                    .first
  end

  def self.eta_minutes(from_lat, from_lng, to_lat, to_lng)
    km = Geo.haversine_km(from_lat.to_f, from_lng.to_f, to_lat.to_f, to_lng.to_f)
    return nil unless km&.finite?

    (km / AVG_SPEED_KMH * 60).ceil
  end
end
