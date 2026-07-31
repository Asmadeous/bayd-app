module Api
  module V1
    module Admin
      # Out-of-area enquiries queue. Staff call these back, then either book +
      # collect via an admin payment link, or decline.
      class CallbackRequestsController < BaseController
        def index
          scope = CallbackRequest.includes(:user, :service).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: { data: records.as_json(include: { user: { only: %i[id email first_name last_name phone] },
                                                           service: { only: %i[id name] } }),
                         pagination: meta }
        end

        def update
          cr = CallbackRequest.find(params[:id])
          cr.update!(params.require(:callback_request).permit(:status, :notes))
          render json: cr.as_json
        end
      end
    end
  end
end
