module Api
  module V1
    module Admin
      class LoyaltyController < BaseController
        def index
          scope = LoyaltyAccount.includes(:user).order(points_balance: :desc)
          records, meta = paginate(scope)
          render json: {
            data: records.as_json(include: { user: { only: %i[id email first_name last_name] } }),
            pagination: meta
          }
        end

        def show
          account = LoyaltyAccount.includes(:user, :loyalty_transactions).find(params[:id])
          render json: account.as_json(include: %i[user loyalty_transactions])
        end
      end
    end
  end
end
