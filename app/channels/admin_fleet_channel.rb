# Admin live fleet view: every technician's location ping is broadcast here so an
# admin sees all techs move on one map in real time. Admin-only. One shared stream
# for the whole fleet (positions carry the employee_profile_id).
class AdminFleetChannel < ApplicationCable::Channel
  STREAM = "admin:fleet".freeze

  def subscribed
    return reject unless current_user.admin?

    stream_from STREAM
  end

  # Broadcast one tech's new position to every watching admin.
  def self.broadcast_position(employee_profile, latitude:, longitude:, on_shift:)
    ActionCable.server.broadcast(
      STREAM,
      {
        type: "fleet_position",
        employee_profile_id: employee_profile.id,
        name: employee_name(employee_profile),
        latitude: latitude,
        longitude: longitude,
        on_shift: on_shift,
        recorded_at: Time.current.iso8601
      }
    )
  end

  def self.employee_name(ep)
    full = [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip
    full.presence || ep.user&.email
  end
end
