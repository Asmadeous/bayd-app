module Api
  module V1
    # The mobile/web apps register their FCM push token here so PushService can
    # reach this user's devices. Scoped to the authenticated user.
    class DeviceTokensController < ApplicationController
      def create
        record = DeviceToken.register!(
          user: current_user,
          token: params.require(:token),
          platform: params[:platform].presence_in(DeviceToken.platforms.keys) || "android"
        )
        render json: { id: record.id, platform: record.platform }, status: :created
      end

      # Unregister a token on logout / uninstall. Only removes the current user's
      # own. The token is passed in the body (FCM tokens contain "/" and ":", which
      # don't round-trip cleanly as a URL path segment).
      def destroy
        current_user.device_tokens.find_by(token: params.require(:token))&.destroy
        head :no_content
      end
    end
  end
end
