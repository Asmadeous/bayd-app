module Api
  module V1
    module Admin
      class MeetingsController < BaseController
        def index
          scope = Meeting.all
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope.order(created_at: :desc).includes(booking: %i[user service]))
          render json: { data: MeetingSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: MeetingSerializer.render_as_hash(Meeting.find(params[:id]))
        end

        def destroy
          Meeting.find(params[:id]).destroy!
          head :no_content
        end
      end
    end
  end
end
