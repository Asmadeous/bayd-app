module Api
  module V1
    module Admin
      class NewsletterSubscribersController < BaseController
        def index
          scope = NewsletterSubscriber.order(created_at: :desc)
          records, meta = paginate(scope, per: 50)
          render json: { data: records.as_json, pagination: meta }
        end

        def destroy
          NewsletterSubscriber.find(params[:id]).destroy!
          head :no_content
        end
      end
    end
  end
end
