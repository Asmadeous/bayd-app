module Api
  module V1
    # Public job board: list/show published postings and accept applications.
    class JobsController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        scope = JobPosting.published
                          .by_type(params[:employment_type])
                          .by_department(params[:department])
                          .by_location(params[:location])
        render json: { data: JobPostingSerializer.render_as_hash(scope) }
      end

      def show
        posting = JobPosting.status_published.find_by!(slug: params[:slug])
        render json: JobPostingSerializer.render_as_hash(posting)
      end

      def apply
        posting = JobPosting.status_published.find_by!(slug: params[:slug])

        # Byte-sniff every upload before attaching — reject anything that isn't a
        # real PDF regardless of extension / declared content type.
        files = Array(params[:documents]).compact_blank
        unless files.all? { |f| pdf?(f) }
          return render json: { error: "Only PDF documents are accepted." }, status: :unprocessable_entity
        end

        application = posting.job_applications.new(application_params)
        application.role_applied_for ||= posting.title
        application.documents.attach(files) if files.any?
        application.save!

        ScanDocumentsJob.perform_later(application.id)
        render json: { message: "Application received. We'll be in touch." }, status: :created
      end

      private

      def application_params
        params.permit(:name, :email, :phone, :message)
      end

      # True only if the uploaded file's actual bytes are a PDF.
      def pdf?(file)
        return false unless file.respond_to?(:tempfile)

        Marcel::MimeType.for(file.tempfile, name: file.original_filename) == "application/pdf"
      end
    end
  end
end
