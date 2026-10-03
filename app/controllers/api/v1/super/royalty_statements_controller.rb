module Api
  module V1
    module Super
      class RoyaltyStatementsController < BaseController
        def index
          scope = RoyaltyStatement.includes(:franchise).order(period_start: :desc)
          scope = scope.where(franchise_id: params[:franchise_id]) if params[:franchise_id].present?
          render json: scope.limit(120).map { |s| statement_json(s) }
        end

        # Build (or refresh, while open) a franchise's statement for a month.
        def create
          month = (Date.iso8601("#{params[:month]}-01") rescue nil)
          return render json: { error: "Pick a month (YYYY-MM)." }, status: :unprocessable_entity if month.nil?

          render json: statement_json(RoyaltyStatementBuilder.for_month(franchise, month)), status: :created
        end

        def mark_paid
          statement = RoyaltyStatement.find(params[:id])
          statement.mark_paid!
          render json: statement_json(statement)
        end

        private

        def statement_json(s)
          s.as_json(only: %i[id franchise_id period_start period_end gross refunds royalty_pct royalty_due currency status paid_at])
           .merge(franchise_name: s.franchise.name)
        end
      end
    end
  end
end
