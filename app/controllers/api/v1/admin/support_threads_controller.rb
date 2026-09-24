module Api
  module V1
    module Admin
      # The admin side of the website support chat: the inbox, a thread's
      # messages, replies, and open/closed status.
      class SupportThreadsController < BaseController
        def index
          scope = SupportThread.newest_first
          scope = scope.where(status: params[:status]) if SupportThread.statuses.key?(params[:status].to_s)
          records, meta = paginate(scope)
          render json: { data: AdminSupportThreadSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          thread = SupportThread.find(params[:id])
          thread.mark_read_by_staff!
          render json: AdminSupportThreadSerializer.render_as_hash(thread, view: :with_messages)
        end

        def reply
          thread = SupportThread.find(params[:id])
          message = thread.post!(body: params[:body].to_s.strip, from_staff: true, sender: current_user)
          render json: SupportMessageSerializer.render_as_hash(message), status: :created
        end

        def update
          thread = SupportThread.find(params[:id])
          thread.update!(status: params.require(:status))
          render json: AdminSupportThreadSerializer.render_as_hash(thread)
        rescue ArgumentError
          render json: { error: "Status must be open or closed." }, status: :unprocessable_entity
        end
      end
    end
  end
end
