module Api
  module V1
    module Admin
      # Admin-editable app settings: group-booking deposit (% + $ minimum) and the
      # business details printed on invoices.
      class SettingsController < BaseController
        KEYS = %w[group_deposit_pct group_deposit_min invoice_hst_number invoice_business_address].freeze
        # Text settings may be cleared; numeric ones ignore a blank submit.
        CLEARABLE = %w[invoice_hst_number invoice_business_address].freeze

        def index
          render json: KEYS.index_with { |k| Setting.get(k) }
        end

        def update
          params.permit(*KEYS).to_h.slice(*KEYS).each do |key, value|
            Setting.set(key, value.to_s.strip) if value.present? || CLEARABLE.include?(key)
          end
          render json: KEYS.index_with { |k| Setting.get(k) }
        end
      end
    end
  end
end
