module Api
  module V1
    module Admin
      # Admin managing ANY technician's date-specific availability overrides.
      # Scoped to the tech named in the nested route (:employee_id). Inherits
      # require_admin! from BaseController.
      class AvailabilityOverridesController < BaseController
        def index
          render json: AvailabilityOverrideSerializer.render_as_hash(employee.availability_overrides.order(:date))
        end

        def create
          override = employee.availability_overrides.create!(override_params)
          render json: AvailabilityOverrideSerializer.render_as_hash(override), status: :created
        end

        def update
          override = employee.availability_overrides.find(params[:id])
          override.update!(override_params)
          render json: AvailabilityOverrideSerializer.render_as_hash(override)
        end

        def destroy
          employee.availability_overrides.find(params[:id]).destroy!
          head :no_content
        end

        private

        def employee
          @employee ||= EmployeeProfile.find(params[:employee_id])
        end

        def override_params
          params.require(:availability_override).permit(:date, :available, :start_time, :end_time)
        end
      end
    end
  end
end
