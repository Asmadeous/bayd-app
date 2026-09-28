module Api
  module V1
    # Messages within a conversation. Participant-only (admins may access any).
    # Posting a message broadcasts it live to the conversation's ChatChannel
    # stream so both participants receive it in real time.
    class MessagesController < ApplicationController
      include ImageUploadValidation

      before_action :set_conversation

      # latest=1: page 1 is the newest messages and later pages go back in time
      # (each page still oldest-first), so opening a long chat shows the latest.
      def index
        messages = @conversation.messages.with_attached_image
        if params[:latest].present?
          records, meta = paginate(messages.order(created_at: :desc))
          records = records.to_a.reverse
        else
          records, meta = paginate(messages.chronological)
        end
        render json: { data: MessageSerializer.render_as_hash(records), pagination: meta }
      end

      def create
        if (reason = ContactWindow.blocked_reason(current_user, @conversation.other_participant(current_user)))
          return render(json: { error: reason, code: "contact_window_closed" }, status: :unprocessable_entity)
        end

        if UserBlock.between?(current_user, @conversation.other_participant(current_user))
          return render(json: { error: "You can't message this person.", code: "blocked" }, status: :unprocessable_entity)
        end

        if params[:image].present? && !valid_image?(params[:image])
          return render(json: { error: "Photo must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity)
        end

        # Text, a photo (multipart `image`), or both.
        message = @conversation.messages.create!(sender: current_user, body: params[:body].to_s, image: uploaded_image)
        ChatChannel.broadcast_message(message)
        ChatMessagePushJob.perform_later(message.id)
        render json: MessageSerializer.render_as_hash(message), status: :created
      end

      # Mark the other participant's messages read (opening the thread), and tell
      # the sender live so their "read" ticks update.
      def read
        at = Time.current
        count = @conversation.mark_read_by!(current_user, at: at)
        ChatChannel.broadcast_read(@conversation, current_user, at) if count.positive?
        render json: { read: count }
      end

      private

      def uploaded_image
        params[:image] if params[:image].is_a?(ActionDispatch::Http::UploadedFile)
      end

      # Load the conversation and enforce access: a participant, or an admin.
      def set_conversation
        @conversation = Conversation.find(params[:conversation_id])
        forbidden unless @conversation.participant?(current_user) || current_user.admin?
      end
    end
  end
end
