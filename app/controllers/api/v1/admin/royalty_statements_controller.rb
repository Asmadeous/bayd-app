module Api
  module V1
    module Admin
      # A franchise admin's view of what their franchise owes the brand.
      class RoyaltyStatementsController < BaseController
        def index
          statements = RoyaltyStatement.order(period_start: :desc).limit(36)
          render json: statements.as_json(only: %i[id period_start period_end gross refunds royalty_pct royalty_due currency status paid_at])
        end
      end
    end
  end
end
