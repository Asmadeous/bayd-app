module Api
  module V1
    class ReviewsController < ApplicationController
      skip_before_action :authenticate_user!, only: :index

      def index
        scope = Review.approved.includes(:user, { employee_profile: :user }, { booking: :service })
        scope = scope.where(employee_profile_id: params[:employee_id]) if params[:employee_id]
        scope = scope.where(featured: true) if params[:featured] == "true"
        # Public: featured first, then newest. First name + last initial only.
        records, meta = paginate(scope.order(featured: :desc, created_at: :desc))
        render json: { data: PublicReviewSerializer.render_as_hash(records), pagination: meta }
      end

      def create
        booking = current_user.bookings.where(status: :completed).find(params[:booking_id])
        if booking.review.present?
          return render json: { error: "This booking has already been reviewed" },
                        status: :unprocessable_entity
        end

        review = booking.create_review!(
          review_params.merge(user: current_user, employee_profile: booking.employee_profile)
        )
        render json: ReviewSerializer.render_as_hash(review), status: :created
      end

      private

      def review_params
        params.require(:review).permit(:rating, :body)
      end
    end
  end
end
