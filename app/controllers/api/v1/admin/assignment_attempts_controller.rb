module Api
  module V1
    module Admin
      class AssignmentAttemptsController < BaseController
        def index
          scope = AssignmentAttempt.includes(:booking_request, :chosen_employee)
                                   .order(created_at: :desc)
          scope = scope.where(booking_request_id: params[:booking_request_id]) if params[:booking_request_id]
          records, meta = paginate(scope)
          render json: { data: records.as_json, pagination: meta }
        end

        def show
          render json: AssignmentAttempt.find(params[:id]).as_json(
            include: { booking_request: {}, chosen_employee: { include: :user } }
          )
        end
      end
    end
  end
end
