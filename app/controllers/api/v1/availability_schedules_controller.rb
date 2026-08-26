module Api
  module V1
    # A technician managing their OWN weekly bookable-hours template. Every action
    # is scoped to current_user.employee_profile — a staff member can never read or
    # write another tech's schedule (the id in the URL is looked up within their own
    # rows, so a foreign id 404s). Admins manage anyone's via the admin namespace.
    class AvailabilitySchedulesController < ApplicationController
      before_action :require_employee!

      def index
        render json: AvailabilityScheduleSerializer.render_as_hash(profile.availability_schedules.order(:day_of_week, :start_time))
      end

      def create
        schedule = profile.availability_schedules.create!(schedule_params)
        render json: AvailabilityScheduleSerializer.render_as_hash(schedule), status: :created
      end

      def update
        schedule = profile.availability_schedules.find(params[:id])
        schedule.update!(schedule_params)
        render json: AvailabilityScheduleSerializer.render_as_hash(schedule)
      end

      def destroy
        profile.availability_schedules.find(params[:id]).destroy!
        head :no_content
      end

      private

      def profile
        @profile ||= current_user.employee_profile || raise(ActiveRecord::RecordNotFound, "No employee profile")
      end

      def schedule_params
        params.require(:availability_schedule).permit(:day_of_week, :start_time, :end_time)
      end
    end
  end
end
