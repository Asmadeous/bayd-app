module Api
  module V1
    class NewsletterSubscribersController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[create unsubscribe]

      # Only a new (or returning) subscriber gets the welcome email, so signing
      # up twice doesn't send it twice.
      def create
        sub = NewsletterSubscriber.find_or_initialize_by(email: params[:email]&.downcase)
        newly_subscribed = !sub.persisted? || !sub.subscribed?
        sub.update!(status: :subscribed, source: params[:source], user: current_user)
        NewsletterMailer.welcome(sub).deliver_later if newly_subscribed
        render json: { message: "Subscribed" }, status: :created
      end

      # GET from the email link sends the browser to the website's confirmation
      # page. POST is the mail app's one-click unsubscribe (RFC 8058), which
      # only needs a 200.
      def unsubscribe
        sub = NewsletterSubscriber.find_by(unsubscribe_token: params[:token].to_s)
        sub&.update!(status: :unsubscribed)
        return head(sub ? :ok : :not_found) if request.post?

        redirect_to "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/newsletter/unsubscribed#{'?invalid=1' unless sub}",
                    allow_other_host: true
      end
    end
  end
end
