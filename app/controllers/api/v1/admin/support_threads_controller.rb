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
          notify_customer(thread, message)
          render json: SupportMessageSerializer.render_as_hash(message), status: :created
        end

        def update
          thread = SupportThread.find(params[:id])
          thread.update!(status: params.require(:status))
          render json: AdminSupportThreadSerializer.render_as_hash(thread)
        rescue ArgumentError
          render json: { error: "Status must be open or closed." }, status: :unprocessable_entity
        end

        private

        # A signed-in customer's thread also shows in the app; push the reply there.
        # Guests only see replies in the website bubble.
        def notify_customer(thread, message)
          return unless thread.user

          PushService.push(
            user: thread.user,
            title: "Beauty @ Your Door replied",
            body: message.body.truncate(140),
            data: { kind: "support_message", path: "/app/support" }
          )
        end
      end
    end
  end
end
