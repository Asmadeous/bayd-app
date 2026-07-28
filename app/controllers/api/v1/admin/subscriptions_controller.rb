module Api
  module V1
    module Admin
      class SubscriptionsController < BaseController
        def index
          scope = Subscription.includes(:user, :service).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: { data: SubscriptionSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: SubscriptionSerializer.render_as_hash(Subscription.find(params[:id]))
        end

        def update
          sub = Subscription.find(params[:id])
          sub.update!(params.require(:subscription).permit(:interval_unit, :interval_count, :status, :next_run_at, :auto_charge))
          render json: SubscriptionSerializer.render_as_hash(sub)
        end

        def cancel
          sub = Subscription.find(params[:id])
          sub.cancel!
          render json: SubscriptionSerializer.render_as_hash(sub)
        end

        def destroy
          Subscription.find(params[:id]).destroy!
          head :no_content
        end
      end
    end
  end
end
