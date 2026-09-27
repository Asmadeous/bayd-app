module Api
  module V1
    # Direct-message conversations for the authenticated user. A conversation is a
    # 1:1 thread; you only ever see your own (admins can open any via messages).
    class ConversationsController < ApplicationController
      PARTICIPANT_PHOTOS = [ { avatar_attachment: :blob }, { employee_profile: { photo_attachment: :blob } } ].freeze

      def index
        convos = Conversation.for_user(current_user).newest_first
                             .includes(participant_one: PARTICIPANT_PHOTOS, participant_two: PARTICIPANT_PHOTOS)
        # With ?page the list comes in pages; without it, everything (older clients).
        if params[:page].present?
          records, meta = paginate(convos)
          return render json: { data: ConversationSerializer.render_as_hash(records, current_user: current_user), pagination: meta }
        end

        render json: ConversationSerializer.render_as_hash(convos, current_user: current_user)
      end

      # One of your own conversations (a thread screen's header). Anyone else's is
      # a 404, so ids can't be probed.
      def show
        convo = Conversation.for_user(current_user).find(params[:id])
        render json: ConversationSerializer.render_as_hash(convo, current_user: current_user)
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
