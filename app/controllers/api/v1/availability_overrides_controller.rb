module Api
  module V1
    # A technician managing their OWN date-specific availability overrides
    # (blackouts / partial-day windows). Scoped to current_user.employee_profile —
    # a foreign id 404s. Admins manage anyone's via the admin namespace.
    class AvailabilityOverridesController < ApplicationController
      before_action :require_employee!

      def index
        render json: AvailabilityOverrideSerializer.render_as_hash(profile.availability_overrides.order(:date))
      end

      def create
        override = profile.availability_overrides.create!(override_params)
        render json: AvailabilityOverrideSerializer.render_as_hash(override), status: :created
      end

      def update
        override = profile.availability_overrides.find(params[:id])
        override.update!(override_params)
        render json: AvailabilityOverrideSerializer.render_as_hash(override)
      end

      def destroy
        profile.availability_overrides.find(params[:id]).destroy!
        head :no_content
      end

      private

      def profile
        @profile ||= current_user.employee_profile || raise(ActiveRecord::RecordNotFound, "No employee profile")
      end

      def override_params
        params.require(:availability_override).permit(:date, :available, :start_time, :end_time)
      end
    end
  end
end
