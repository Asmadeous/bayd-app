# When a technician's app reports a new location, push it to the customer(s)
# whose booking that tech is currently heading to. "Currently heading to" = the
# tech's next active booking today that hasn't started yet. ETA is a real driving
# estimate from Google Directions (Directions falls back to straight-line if the
# routing call is unavailable).
class TripBroadcaster
  def self.call(employee_profile:, latitude:, longitude:)
    booking = upcoming_booking_for(employee_profile)
    return unless booking&.service_latitude && booking&.service_longitude

    eta = Directions.eta_minutes(latitude, longitude, booking.service_latitude, booking.service_longitude)
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
end
