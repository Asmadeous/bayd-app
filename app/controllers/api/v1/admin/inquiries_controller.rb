module Api
  module V1
    module Admin
      class InquiriesController < BaseController
        def franchise
          records, meta = paginate(FranchiseInquiry.order(created_at: :desc))
          render json: { data: records.as_json, pagination: meta }
        end

        def jobs
          records, meta = paginate(JobApplication.order(created_at: :desc))
          render json: { data: records.as_json, pagination: meta }
        end

        def contacts
          records, meta = paginate(ContactMessage.order(created_at: :desc))
          render json: { data: records.as_json, pagination: meta }
        end

        def update_franchise
          FranchiseInquiry.find(params[:id]).update!(status: params[:status])
          head :ok
        end

        def update_job
          JobApplication.find(params[:id]).update!(status: params[:status])
          head :ok
        end
      end
    end
  end
end
