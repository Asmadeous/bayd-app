module Api
  module V1
    module Admin
      class ReviewsController < BaseController
        def index
          scope = Review.includes(:user, :employee_profile).order(created_at: :desc)
          scope = scope.where(approved: params[:approved]) unless params[:approved].nil?
          records, meta = paginate(scope)
          render json: { data: ReviewSerializer.render_as_hash(records), pagination: meta }
        end

        def approve
          review = Review.find(params[:id])
          review.update!(approved: true)
          render json: ReviewSerializer.render_as_hash(review)
        end

        def feature
          review = Review.find(params[:id])
          review.update!(featured: !review.featured)
          render json: ReviewSerializer.render_as_hash(review)
        end

        def destroy
          Review.find(params[:id]).destroy!
          head :no_content
        end
      end
    end
  end
end
