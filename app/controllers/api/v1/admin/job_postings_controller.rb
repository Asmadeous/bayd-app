module Api
  module V1
    module Admin
      class JobPostingsController < BaseController
        def index
          scope = JobPosting.order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(employment_type: params[:employment_type]) if params[:employment_type].present?
          scope = scope.where(department: params[:department]) if params[:department].present?
          records, meta = paginate(scope)
          render json: { data: JobPostingSerializer.render_as_hash(records, view: :admin), pagination: meta }
        end

        def show
          render json: JobPostingSerializer.render_as_hash(find_posting, view: :admin)
        end

        def create
          posting = JobPosting.new(posting_params)
          posting.posted_at ||= Time.current if posting.status_published?
          posting.save!
          render json: JobPostingSerializer.render_as_hash(posting, view: :admin), status: :created
        end

        def update
          posting = find_posting
          posting.assign_attributes(posting_params)
          posting.posted_at ||= Time.current if posting.status_published?
          posting.save!
          render json: JobPostingSerializer.render_as_hash(posting, view: :admin)
        end

        def destroy
          find_posting.destroy!
          head :no_content
        end

        private

        def find_posting = JobPosting.find(params[:id])

        def posting_params
          params.require(:job_posting).permit(
            :title, :slug, :department, :location, :employment_type,
            :description, :requirements, :salary_min, :salary_max, :status, :posted_at
          )
        end
      end
    end
  end
end
