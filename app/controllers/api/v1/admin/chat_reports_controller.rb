module Api
  module V1
    module Admin
      # Chat reports from the apps. Admins read the reported conversation here
      # (they're not a participant, so the regular chat API won't show it) and
      # mark the report reviewed once handled.
      class ChatReportsController < BaseController
        MESSAGE_LIMIT = 300

        def index
          scope = ChatReport.includes(:reporter, :reported_user, :reviewed_by).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: {
            data: records.map { |report| report_json(report) },
            open_count: ChatReport.status_open.count,
            pagination: meta
          }
        end

        def show
          report = ChatReport.find(params[:id])
          messages = report.conversation.messages.includes(image_attachment: :blob)
                           .order(created_at: :desc).limit(MESSAGE_LIMIT).reverse
          render json: report_json(report).merge(
            messages: MessageSerializer.render_as_hash(messages),
            reports_against_user: ChatReport.where(reported_user_id: report.reported_user_id).count
          )
        end

        def update
          report = ChatReport.find(params[:id])
          params[:status] == "open" ? report.reopen! : report.mark_reviewed!(current_user)
          render json: report_json(report)
        end

        private

        def report_json(report)
          {
            id: report.id,
            conversation_id: report.conversation_id,
            reason: report.reason,
            details: report.details,
            status: report.status,
            created_at: report.created_at,
            reviewed_at: report.reviewed_at,
            reviewed_by: report.reviewed_by && person(report.reviewed_by),
            reporter: person(report.reporter),
            reported_user: person(report.reported_user)
          }
        end

        def person(user)
          {
            id: user.id,
            name: [ user.first_name, user.last_name ].compact_blank.join(" ").presence || user.email,
            email: user.email,
            role: user.role
          }
        end
      end
    end
  end
end
