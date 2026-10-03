# Admin live fleet view: every technician's location ping is broadcast here so an
# admin sees their franchise's techs move on one map in real time. Admin-only. A
# franchise admin streams their franchise; a super admin streams every franchise
# (positions carry the employee_profile_id).
class AdminFleetChannel < ApplicationCable::Channel
  ALL_STREAM = "admin:fleet:all".freeze

  def self.stream_for_franchise(franchise_id) = "admin:fleet:#{franchise_id}"

  def subscribed
    return reject unless current_user.admin?

    stream_from current_user.super_admin? ? ALL_STREAM : self.class.stream_for_franchise(current_user.franchise_id)
  end

  # Broadcast one tech's new position to their franchise's admins and super admins.
  def self.broadcast_position(employee_profile, latitude:, longitude:, on_shift:)
    [ stream_for_franchise(employee_profile.franchise_id), ALL_STREAM ].each do |stream|
      ActionCable.server.broadcast(stream, position_payload(employee_profile, latitude, longitude, on_shift))
    end
  end

  def self.position_payload(employee_profile, latitude, longitude, on_shift)
    {
      type: "fleet_position",
      employee_profile_id: employee_profile.id,
      name: employee_name(employee_profile),
      latitude: latitude,
      longitude: longitude,
      on_shift: on_shift,
      recorded_at: Time.current.iso8601
    }
  end

  def self.employee_name(ep)
    full = [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip
    full.presence || ep.user&.email
  end
end
