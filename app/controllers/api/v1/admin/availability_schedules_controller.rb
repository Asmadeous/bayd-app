module Api
  module V1
    module Admin
      # Admin managing ANY technician's weekly bookable-hours template. Scoped to
      # the tech named in the nested route (:employee_id). Inherits require_admin!
      # from BaseController.
      class AvailabilitySchedulesController < BaseController
        def index
          render json: AvailabilityScheduleSerializer.render_as_hash(employee.availability_schedules.order(:day_of_week, :start_time))
        end

        def create
          schedule = employee.availability_schedules.create!(schedule_params)
          render json: AvailabilityScheduleSerializer.render_as_hash(schedule), status: :created
        end

        def update
          schedule = employee.availability_schedules.find(params[:id])
          schedule.update!(schedule_params)
          render json: AvailabilityScheduleSerializer.render_as_hash(schedule)
        end

        def destroy
          employee.availability_schedules.find(params[:id]).destroy!
          head :no_content
        end

        private

        def employee
          @employee ||= EmployeeProfile.find(params[:employee_id])
        end

        def schedule_params
          params.require(:availability_schedule).permit(:day_of_week, :start_time, :end_time)
        end
      end
    end
  end
end
