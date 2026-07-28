module Api
  module V1
    # Customer-managed service subscriptions.
    class SubscriptionsController < ApplicationController
      def index
        subs = current_user.subscriptions.order(created_at: :desc).includes(:service, :address)
        render json: { data: SubscriptionSerializer.render_as_hash(subs) }
      end

      # Detail + billing/appointment history.
      def show
        sub = current_user.subscriptions.find(params[:id])
        render json: SubscriptionSerializer.render_as_hash(sub, view: :detail)
      end

      def pause  = act!(:pause!)
      def resume = act!(:resume!)
      def cancel = act!(:cancel!)
      def skip   = act!(:skip_next!)

      def change_frequency
        sub = current_user.subscriptions.find(params[:id])
        sub.change_frequency!(params[:interval_unit], params[:interval_count])
        render json: SubscriptionSerializer.render_as_hash(sub.reload)
      rescue ArgumentError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def act!(method)
        sub = current_user.subscriptions.find(params[:id])
        sub.public_send(method)
        render json: SubscriptionSerializer.render_as_hash(sub.reload)
      end
    end
  end
end
