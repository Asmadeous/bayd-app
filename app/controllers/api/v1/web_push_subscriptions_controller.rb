module Api
  module V1
    # Browser notifications for the website: the public key browsers subscribe
    # with, and saving or removing this browser's subscription.
    class WebPushSubscriptionsController < ApplicationController
      skip_before_action :authenticate_user!, only: :key

      # 404 while the server has no VAPID key, so the website hides the option.
      def key
        public_key = WebPushClient.public_key_b64
        return head(:not_found) unless public_key

        render json: { public_key: public_key }
      end

      # One row per browser. Signing in as someone else on the same browser moves
      # the subscription to them.
      def create
        sub = WebPushSubscription.find_or_initialize_by(endpoint: subscription_params[:endpoint])
        sub.update!(
          user: current_user,
          p256dh: subscription_params.dig(:keys, :p256dh),
          auth: subscription_params.dig(:keys, :auth),
          user_agent: request.user_agent.to_s.first(255)
        )
        render json: { subscribed: true }, status: :created
      end

      def destroy
        current_user.web_push_subscriptions.where(endpoint: params[:endpoint].to_s).destroy_all
        head :no_content
      end

      # "Send me a test" from the dashboard.
      def test
        return render(json: { error: "You haven't turned on notifications in this browser." }, status: :unprocessable_entity) unless current_user.web_push_subscriptions.exists?

        WebPushJob.perform_later(current_user.id, "Notifications are on", "You'll get BAYD updates in this browser.", web_path)
        render json: { sent: true }
      end

      private

      def subscription_params
        params.require(:subscription).permit(:endpoint, keys: %i[p256dh auth])
      end

      def web_path = NotificationService.web_path(current_user, nil)
    end
  end
end
