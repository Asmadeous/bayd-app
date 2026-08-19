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

        # Create the partner org AND its bookable provider (a partner-role User +
        # EmployeeProfile) in one transaction. The provider is dormant until an
        # admin sets its coverage + services on the Employees page.
        def create
          partner = nil
          ActiveRecord::Base.transaction do
            partner = Partner.create!(partner_params)
            partner.ensure_provider!(password: params.dig(:partner, :password))
          end
          render json: PartnerSerializer.render_as_hash(partner), status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: partner_create_error(e) }, status: :unprocessable_entity
        end

        def update
          partner = find_partner
          partner.update!(partner_params)
          render json: PartnerSerializer.render_as_hash(partner)
        end

        # Deactivate the partner's provider (keep its bookings/payout history),
        # then remove the partner org. The provider profile + its User are kept.
        def destroy
          partner = find_partner
          partner.deactivate_provider!
          partner.destroy!
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

        # The partner's email doubles as its provider login, so a clash with an
        # existing user (or a missing email) is the likeliest create failure —
        # surface a readable message rather than a raw validation dump.
        def partner_create_error(err)
          msg = err.record&.errors&.full_messages&.to_sentence
          if msg.to_s.match?(/email.*taken/i)
            "That email already belongs to another account — use a different email for this partner."
          else
            msg.presence || "Could not create partner."
          end
        end

        def find_partner = Partner.find(params[:id])

        def partner_params
          params.require(:partner).permit(:name, :email, :phone, :status, :platform_fee_pct, :payout_notes)
        end
      end
    end
  end
end
