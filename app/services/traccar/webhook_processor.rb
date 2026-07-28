module Traccar
  class WebhookProcessor
    def initialize(payload)
      @payload = payload.with_indifferent_access
    end

    def call
      positions = Array(@payload[:positions])
      positions.each { |pos| upsert_position(pos) }
    end

    private

    def upsert_position(pos)
      device_id = pos[:deviceId]&.to_s
      return unless device_id

      ep = EmployeeProfile.find_by(traccar_device_id: device_id)
      return unless ep

      recorded_at = Time.parse(pos[:fixTime] || pos[:deviceTime]) rescue Time.current

      EmployeeCurrentLocation.upsert(
        {
          employee_profile_id: ep.id,
          latitude:            pos[:latitude],
          longitude:           pos[:longitude],
          accuracy_meters:     pos[:accuracy]&.to_i,
          recorded_at:         recorded_at,
          updated_at:          Time.current,
          created_at:          Time.current
        },
        unique_by: :employee_profile_id,
        update_only: %i[latitude longitude accuracy_meters recorded_at updated_at]
      )

      LocationPing.create!(
        employee_profile: ep,
        latitude:         pos[:latitude],
        longitude:        pos[:longitude],
        accuracy_meters:  pos[:accuracy]&.to_i,
        recorded_at:      recorded_at,
        source:           "gps"
      )
    end
  end
end
