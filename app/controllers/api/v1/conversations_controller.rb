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
          return render(json: { error: reason, code: "no_shared_booking" }, status: :unprocessable_entity)
        end
        return render(json: { error: BLOCKED_ERROR, code: "blocked" }, status: :unprocessable_entity) if UserBlock.between?(current_user, other)

        convo = Conversation.between(current_user, other)
        render json: ConversationSerializer.render_as_hash(convo, current_user: current_user), status: :created
      end

      # Block the other person: neither of you can message the other until you
      # unblock. Blocking twice is harmless.
      def block
        convo = Conversation.for_user(current_user).find(params[:id])
        UserBlock.find_or_create_by!(blocker: current_user, blocked: convo.other_participant(current_user))
        render json: ConversationSerializer.render_as_hash(convo, current_user: current_user)
      end

      def unblock
        convo = Conversation.for_user(current_user).find(params[:id])
        UserBlock.where(blocker: current_user, blocked: convo.other_participant(current_user)).destroy_all
        render json: ConversationSerializer.render_as_hash(convo, current_user: current_user)
      end

      # Report the other person. Every admin is alerted in-app and the team by
      # email, so it's reviewed promptly.
      def report
        convo = Conversation.for_user(current_user).find(params[:id])
        report = convo.chat_reports.create!(
          reporter: current_user,
          reported_user: convo.other_participant(current_user),
          reason: params[:reason].to_s,
          details: params[:details].to_s.strip.presence
        )
        alert_admins_of_report(report)
        render json: { id: report.id, status: report.status }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
      end

      private

      BLOCKED_ERROR = "You can't message this person.".freeze

      def alert_admins_of_report(report)
        who = report.reported_user
        name = [ who.first_name, who.last_name ].compact_blank.join(" ").presence || "a user"
        User.where(role: :admin, deleted_at: nil).find_each do |admin|
          NotificationService.deliver(
            user: admin, kind: :chat_reported,
            title: "Chat report: #{name}",
            body: "#{report.reason}#{report.details ? " - #{report.details}" : ""}",
            action_url: "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/dashboard/admin/chat-reports?id=#{report.id}",
            metadata: { conversation_id: report.conversation_id, chat_report_id: report.id }
          )
        end
        AdminMailer.chat_reported(report).deliver_later
      rescue StandardError => e
        Rails.logger.warn("[ConversationsController] report alert for ##{report.id} failed: #{e.message}")
      end
    end
  end
end
