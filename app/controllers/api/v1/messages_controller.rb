module Api
  module V1
    # Messages within a conversation. Participant-only (admins may access any).
    # Posting a message broadcasts it live to the conversation's ChatChannel
    # stream so both participants receive it in real time.
    class MessagesController < ApplicationController
      before_action :set_conversation

      def index
        records, meta = paginate(@conversation.messages.chronological)
        render json: { data: MessageSerializer.render_as_hash(records), pagination: meta }
      end

      def create
        message = @conversation.messages.create!(sender: current_user, body: params.require(:body))
        ChatChannel.broadcast_message(message)
        render json: MessageSerializer.render_as_hash(message), status: :created
      end

      private

      # Load the conversation and enforce access: a participant, or an admin.
      def set_conversation
        @conversation = Conversation.find(params[:conversation_id])
        forbidden unless @conversation.participant?(current_user) || current_user.admin?
      end
    end
  end
end
