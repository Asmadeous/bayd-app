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

        # Hire the applicant: creates their staff account and emails them a link
        # to set a password. The admin confirms the details first (staff sign in
        # with a company email, not the one they applied with).
        def hire
          application = find_application
          hire = params.require(:hire).permit(:first_name, :last_name, :email, :phone, :title)
          if hire[:first_name].blank? || hire[:email].blank?
            return render json: { error: "First name and sign-in email are required." }, status: :unprocessable_entity
          end

          result = StaffOnboarding.hire!(
            application,
            first_name: hire[:first_name], last_name: hire[:last_name], email: hire[:email],
            phone: hire[:phone], title: hire[:title]
          )

          if result.success?
            render json: { employee_profile_id: result.profile.id, email: result.profile.user.email }, status: :created
          else
            render json: { error: result.error }, status: :unprocessable_entity
          end
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
