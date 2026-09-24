module Api
  module V1
    # The website support chat, open to visitors without an account. The thread
    # token returned on create is the visitor's only credential for reading and
    # replying; it is never derivable from their email. A signed-in customer's
    # thread is linked to their user as well.
    class SupportThreadsController < ApplicationController
      skip_before_action :authenticate_user!

      rate_limit to: 5, within: 10.minutes, only: :create,
                 with: -> { render json: { error: "Too many chats started. Please try again in a few minutes." }, status: :too_many_requests }
      rate_limit to: 20, within: 1.minute, only: :create_message,
                 with: -> { render json: { error: "You're sending messages too quickly." }, status: :too_many_requests }

      def create
        thread = SupportThread.new(thread_params.merge(user: signed_in_user))
        SupportThread.transaction do
          thread.save!
          @message = thread.post!(body: params[:body].to_s.strip, from_staff: false)
        end
        SupportMessageNotifyJob.perform_later(@message.id)

        render json: { token: thread.token, thread: render_thread(thread) }, status: :created
      end

      # The widget polls this for its unread badge while closed, so replies are
      # only marked read when it asks (the chat panel is open).
      def show
        thread = find_thread
        thread.mark_read_by_visitor! if ActiveModel::Type::Boolean.new.cast(params[:mark_read])
        render json: render_thread(thread)
      end

      def create_message
        thread = find_thread
        message = thread.post!(body: params[:body].to_s.strip, from_staff: false)
        SupportMessageNotifyJob.perform_later(message.id)
        render json: SupportMessageSerializer.render_as_hash(message), status: :created
      end

      private

      def thread_params = params.require(:thread).permit(:name, :email)

      def find_thread = SupportThread.find_by!(token: params[:token].to_s)

      def render_thread(thread)
        {
          status: thread.status,
          name: thread.name,
          unread_count: thread.unread_for_visitor,
          messages: SupportMessageSerializer.render_as_hash(thread.messages.includes(:sender))
        }
      end

      # Links the thread to the customer when the widget sends their token; a
      # missing or bad token just means a guest.
      def signed_in_user
        token = request.headers["Authorization"]&.split(" ")&.last
        return if token.blank?

        User.find_by(id: JWT.decode(token, jwt_secret, true, algorithm: "HS256").first["sub"])
      rescue JWT::DecodeError
        nil
      end
    end
  end
end
