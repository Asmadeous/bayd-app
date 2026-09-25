module Api
  module V1
    # Direct-message conversations for the authenticated user. A conversation is a
    # 1:1 thread; you only ever see your own (admins can open any via messages).
    class ConversationsController < ApplicationController
      def index
        convos = Conversation.for_user(current_user).newest_first
        render json: ConversationSerializer.render_as_hash(convos, current_user: current_user)
      end

      # Open (or reuse) the conversation with another user.
      def create
        other = User.find(params.require(:user_id))
        return render(json: { error: "You can't message yourself." }, status: :unprocessable_entity) if other == current_user
        if (reason = ContactWindow.blocked_reason(current_user, other))
          return render(json: { error: reason, code: "contact_window_closed" }, status: :unprocessable_entity)
        end

        convo = Conversation.between(current_user, other)
        render json: ConversationSerializer.render_as_hash(convo, current_user: current_user), status: :created
      end
    end
  end
end
