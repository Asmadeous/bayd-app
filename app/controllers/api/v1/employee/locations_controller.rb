module Api
  module V1
    module Employee
      # The tech's app posts its live GPS here while on the road. We record the
      # ping (history) + the current location (latest), then broadcast the tech's
      # position + ETA to the customer watching the booking they're heading to
      # (TripChannel). Best-effort broadcast — a failure never breaks the update.
      class LocationsController < ApplicationController
        before_action :require_employee!

        def create
          lat = params.require(:latitude).to_f
          lng = params.require(:longitude).to_f
          accuracy = params[:accuracy_meters].presence&.to_i

          profile.location_pings.create!(latitude: lat, longitude: lng, accuracy_meters: accuracy, recorded_at: Time.current)
          EmployeeCurrentLocation.find_or_initialize_by(employee_profile: profile)
                                 .update!(latitude: lat, longitude: lng, recorded_at: Time.current)

          broadcast_trip(lat, lng)
          head :no_content
        end

        private

        def broadcast_trip(lat, lng)
          TripBroadcaster.call(employee_profile: profile, latitude: lat, longitude: lng)
        rescue StandardError => e
          Rails.logger.warn("[Employee::LocationsController] trip broadcast failed: #{e.message}")
        end

        def profile
          @profile ||= current_user.employee_profile || raise(ActiveRecord::RecordNotFound, "No employee profile")
        end
      end
    end
  end
end
