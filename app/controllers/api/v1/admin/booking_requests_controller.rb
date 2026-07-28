module Api
  module V1
    module Admin
      class BookingRequestsController < BaseController
        def index
          scope = BookingRequest.includes(:user, :service, :service_area).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: { data: records.as_json(include: %i[user service service_area]), pagination: meta }
        end

        def show
          render json: BookingRequest.includes(:user, :service, :service_area, :assignment_attempts)
                                     .find(params[:id])
                                     .as_json(include: %i[user service service_area assignment_attempts])
        end
      end
    end
  end
end
