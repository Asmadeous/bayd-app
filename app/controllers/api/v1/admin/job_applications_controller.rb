module Api
  module V1
    module Admin
      class JobApplicationsController < BaseController
        def index
          scope = JobApplication.includes(:job_posting, documents_attachments: :blob).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(job_posting_id: params[:job_posting_id]) if params[:job_posting_id].present?
          records, meta = paginate(scope)
          render json: { data: JobApplicationSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: JobApplicationSerializer.render_as_hash(find_application)
        end

        def update
          application = find_application
          application.update!(params.require(:job_application).permit(:status))
          render json: JobApplicationSerializer.render_as_hash(application)
        end

        def destroy
          find_application.destroy!
          head :no_content
        end

        # Secure, scan-gated, admin-only document download. Forces an attachment
        # so the file is never rendered/executed in the browser, and never
        # exposes a public Active Storage blob URL.
        def document
          application = find_application
          return head :forbidden unless application.documents_downloadable?

          doc = application.documents.find(params[:doc_id])
          send_data doc.download,
                    filename: doc.filename.to_s,
                    type: "application/pdf",
                    disposition: "attachment"
        end

        private

        def find_application = JobApplication.find(params[:id])
      end
    end
  end
end
