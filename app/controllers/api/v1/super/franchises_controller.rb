module Api
  module V1
    module Super
      # Create and set up franchises: everything a country differs on is entered
      # here, then the franchise goes live once it's ready.
      class FranchisesController < BaseController
        EDITABLE = %i[
          name slug country_code currency locale time_zone open_hour close_hour tax_name tax_rate
          tax_registration_number contact_email contact_phone reply_to_email sender_name sms_sender
          staff_email_domain subdomain custom_domain royalty_pct privacy_body terms_body business_address
        ].freeze

        def index
          render json: FranchiseSerializer.render_as_hash(Franchise.order(is_default: :desc, name: :asc))
        end

        def show
          render json: FranchiseSerializer.render_as_hash(franchise)
        end

        # New franchises start as drafts (invisible to customers) until go-live.
        def create
          record = Franchise.create!(franchise_params.merge(status: "draft"))
          render json: FranchiseSerializer.render_as_hash(record), status: :created
        end

        def update
          franchise.update!(franchise_params)
          render json: FranchiseSerializer.render_as_hash(franchise)
        end

        # { provider: "square", values: { access_token: "...", ... } }; blank
        # values keep what's stored. The response only says which keys are present.
        def credentials
          provider = params.require(:provider).to_s
          return render json: { error: "Unknown payment provider." }, status: :unprocessable_entity unless Franchise::CREDENTIAL_KEYS.key?(provider)

          franchise.update_credentials!(provider, params.require(:values).permit(*Franchise::CREDENTIAL_KEYS[provider]).to_h)
          render json: FranchiseSerializer.render_as_hash(franchise)
        end

        def test_payments
          result = Current.set(franchise: franchise) { SquareService.test_connection }
          render json: result
        end

        def copy_catalog
          source = params[:from_franchise_id].present? ? Franchise.find(params[:from_franchise_id]) : Franchise.default
          return render json: { error: "Choose another franchise to copy from." }, status: :unprocessable_entity if source == franchise

          render json: { copied: CatalogCopy.call(from: source, to: franchise) }
        end

        def go_live
          unless franchise.ready_to_go_live?
            missing = franchise.readiness.reject { |_, ok| ok }.keys.map { |k| k.to_s.humanize.downcase }
            return render json: { error: "Not ready to go live. Still needed: #{missing.to_sentence}.", readiness: franchise.readiness },
                          status: :unprocessable_entity
          end

          franchise.update!(status: "live")
          render json: FranchiseSerializer.render_as_hash(franchise)
        end

        def suspend
          return render json: { error: "The default franchise can't be suspended." }, status: :unprocessable_entity if franchise.is_default

          franchise.update!(status: "suspended")
          render json: FranchiseSerializer.render_as_hash(franchise)
        end

        private

        def franchise_params = params.require(:franchise).permit(*EDITABLE)
      end
    end
  end
end
