require "base64"

module Api
  module V1
    module Admin
      # Live staff locations + travel/fuel metrics for the admin dashboard.
      # The map is rendered server-side via the Google Static Maps API (the key
      # stays on the server, so the existing IP-restricted key works) and returned
      # as an embedded data URI — no key or map SDK in the browser.
      class StaffLocationsController < BaseController
        STATIC_MAP_URL = "https://maps.googleapis.com/maps/api/staticmap".freeze

        def index
          profiles = EmployeeProfile.includes(:user, :employee_current_location, :shifts)

          data = profiles.map do |ep|
            loc = ep.employee_current_location
            {
              employee_profile_id: ep.id,
              name:                staff_name(ep),
              on_shift:            ep.on_shift,
              latitude:            loc&.latitude,
              longitude:           loc&.longitude,
              recorded_at:         loc&.recorded_at,
              distance_km:         ep.shifts.sum(:distance_km).to_f.round(2),
              fuel_reimbursement:  ep.shifts.sum(:fuel_reimbursement).to_f.round(2)
            }
          end

          render json: { data: data, map_image: static_map_data_uri }
        end

        private

        def staff_name(ep)
          full = [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip
          full.presence || ep.user&.email
        end

        # Fetch a static map with a marker per staff current location; return it as
        # a data URI (or nil if there are no locations / the key isn't configured).
        def static_map_data_uri
          key = ENV.fetch("GOOGLE_MAPS_API_KEY", "")
          return nil if key.blank?

          points = EmployeeCurrentLocation.limit(60).map { |l| "#{l.latitude.to_f},#{l.longitude.to_f}" }
          return nil if points.empty?

          resp = Faraday.get(STATIC_MAP_URL, {
            size:    "640x400",
            scale:   2,
            markers: "color:0xc96c83|#{points.join('|')}",
            key:     key
          })
          return nil unless resp.status == 200

          type = resp.headers["content-type"].presence || "image/png"
          "data:#{type};base64,#{Base64.strict_encode64(resp.body)}"
        rescue Faraday::Error, StandardError => e
          Rails.logger.warn("[StaffLocations] static map failed: #{e.message}")
          nil
        end
      end
    end
  end
end
