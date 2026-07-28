module Api
  module V1
    class NewsletterSubscribersController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[create unsubscribe]

      def create
        sub = NewsletterSubscriber.find_or_initialize_by(email: params[:email]&.downcase)
        sub.update!(status: :subscribed, source: params[:source], user: current_user)
        render json: { message: "Subscribed" }, status: :created
      end

      def unsubscribe
        sub = NewsletterSubscriber.find_by!(unsubscribe_token: params[:token])
        sub.update!(status: :unsubscribed)
        render json: { message: "Unsubscribed" }
      end
    end
  end
end
