# Day-of live tracking: a customer watches the assigned technician travel to their
# booking. The customer subscribes with a booking_id they own; the tech's app
# posts location updates (Api::V1::Employee::LocationsController), which broadcast
# the tech's position + ETA to this booking's stream.
class TripChannel < ApplicationCable::Channel
  def subscribed
    booking = Booking.find_by(id: params[:booking_id])
    # Only the booking's own customer may watch it, and only for an active booking.
    return reject unless booking && booking.user_id == current_user.id
    return reject unless booking.status.in?(%w[confirmed in_progress])

    stream_from self.class.stream_name(booking)
  end

  def self.stream_name(booking)
    "trip:booking:#{booking.id}"
  end

  # Broadcast the tech's current position + estimated arrival to the customer(s)
  # watching this booking. Called from the tech location update.
  def self.broadcast_position(booking, latitude:, longitude:, eta_minutes:)
    ActionCable.server.broadcast(
      stream_name(booking),
      { type: "position", booking_id: booking.id, latitude: latitude, longitude: longitude, eta_minutes: eta_minutes }
    )
  end
end
