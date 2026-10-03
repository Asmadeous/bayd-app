module Api
  module V1
    module Admin
      # Whole-visit moves for the office: no cutoff or cap. keep_techs keeps every
      # line with its tech; otherwise the planner re-picks who does what. A single
      # line is still moved or reassigned through the bookings endpoints.
      class VisitsController < BaseController
        def show
          render json: VisitSerializer.render_as_hash(visit)
        end

        def reschedule
          new_start = BusinessHours.parse_local(params[:starts_at])
          return render(json: { error: "A valid new date and time is required." }, status: :unprocessable_entity) if new_start.nil?

          visit.reschedule!(new_start: new_start, keep_techs: ActiveModel::Type::Boolean.new.cast(params[:keep_techs]))
          render json: VisitSerializer.render_as_hash(visit.reload)
        rescue Booking::RescheduleError => e
          render json: { error: e.reason.to_s.humanize, code: e.reason },
                 status: e.reason == :slot_taken ? :conflict : :unprocessable_entity
        end

        def cancel
          visit.cancel!(reason: params[:reason])
          render json: VisitSerializer.render_as_hash(visit.reload)
        end

        private

        def visit = @visit ||= Visit.find(params[:id])
      end
    end
  end
end
