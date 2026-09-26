module Api
  module V1
    class LoyaltyController < ApplicationController
      def show
        account = current_user.loyalty_account || current_user.create_loyalty_account!
        render json: LoyaltyAccountSerializer.render_as_hash(account.reload)
      end

      # Points history, newest first, a page at a time.
      def transactions
        account = current_user.loyalty_account || current_user.create_loyalty_account!
        records, meta = paginate(account.loyalty_transactions.order(created_at: :desc))
        render json: { data: LoyaltyTransactionSerializer.render_as_hash(records), pagination: meta }
      end
    end
  end
end
