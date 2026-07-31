module Api
  module V1
    module Admin
      # Admin-editable app settings (currently the group-booking deposit %).
      class SettingsController < BaseController
        KEYS = %w[group_deposit_pct].freeze

        def index
          render json: KEYS.index_with { |k| Setting.get(k) }
        end

        def update
          params.permit(*KEYS).to_h.slice(*KEYS).each do |key, value|
            Setting.set(key, value) if value.present?
          end
          render json: KEYS.index_with { |k| Setting.get(k) }
        end
      end
    end
  end
end
