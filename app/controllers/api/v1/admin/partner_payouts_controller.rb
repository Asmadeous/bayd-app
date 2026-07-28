module Api
  module V1
    module Admin
      class PartnerPayoutsController < BaseController
        def index
          scope = PartnerPayout.recent.includes(:partner)
          scope = scope.where(partner_id: params[:partner_id]) if params[:partner_id].present?
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: { data: PartnerPayoutSerializer.render_as_hash(records), pagination: meta }
        end

        # Mark a pending payout as settled (funds sent outside the app).
        def mark_paid
          payout = PartnerPayout.find(params[:id])
          payout.mark_paid!(notes: params[:notes])
          render json: PartnerPayoutSerializer.render_as_hash(payout)
        end
      end
    end
  end
end
