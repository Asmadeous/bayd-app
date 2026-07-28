module Api
  module V1
    module Admin
      class PartnersController < BaseController
        def index
          records, meta = paginate(Partner.order(:name))
          render json: { data: PartnerSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: PartnerSerializer.render_as_hash(find_partner)
        end

        def create
          partner = Partner.create!(partner_params)
          render json: PartnerSerializer.render_as_hash(partner), status: :created
        end

        def update
          partner = find_partner
          partner.update!(partner_params)
          render json: PartnerSerializer.render_as_hash(partner)
        end

        def destroy
          find_partner.destroy!
          head :no_content
        end

        # Providers attached to this partner, plus payout history.
        def detail
          partner = find_partner
          render json: {
            partner:  PartnerSerializer.render_as_hash(partner),
            providers: EmployeeProfileSerializer.render_as_hash(partner.employee_profiles.includes(:user)),
            payouts:  PartnerPayoutSerializer.render_as_hash(partner.partner_payouts.recent)
          }
        end

        # Settle everything currently owed into a new pending payout.
        def settle
          partner = find_partner
          payout = partner.settle_pending!
          render json: PartnerPayoutSerializer.render_as_hash(payout), status: :created
        end

        private

        def find_partner = Partner.find(params[:id])

        def partner_params
          params.require(:partner).permit(:name, :email, :phone, :status, :platform_fee_pct, :payout_notes)
        end
      end
    end
  end
end
