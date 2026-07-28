module Api
  module V1
    class LoyaltyController < ApplicationController
      def show
        account = current_user.loyalty_account || current_user.create_loyalty_account!
        render json: LoyaltyAccountSerializer.render_as_hash(account.reload)
      end
    end
  end
end
