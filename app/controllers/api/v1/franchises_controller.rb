module Api
  module V1
    # The current franchise's public setup (currency, zone, hours, contacts), so
    # the website and apps format money and times the way that branch does.
    class FranchisesController < ApplicationController
      skip_before_action :authenticate_user!

      def current
        render json: (Current.franchise || Franchise.default).public_config
      end

      # Live franchises a customer can choose between (one per country, usually).
      def index
        render json: Franchise.status_live.order(is_default: :desc, name: :asc)
                              .map { |f| { slug: f.slug, name: f.name, country_code: f.country_code } }
      end

      # The franchise's own privacy policy and terms (blank = the site's defaults).
      def legal
        franchise = Current.franchise || Franchise.default
        render json: { privacy_body: franchise.privacy_body, terms_body: franchise.terms_body,
                       contact_email: franchise.contact_email, name: franchise.name }
      end

      # Which live franchise serves an address: one in that country whose
      # technicians cover it, else that country's franchise, else the default.
      # The customer app then sends its slug as X-Franchise.
      def resolve
        country = params[:country_code].to_s.upcase.presence
        lat = params[:latitude].presence&.to_f
        lng = params[:longitude].presence&.to_f
        candidates = Franchise.status_live.order(is_default: :desc)
        candidates = candidates.where(country_code: country) if country

        serving = candidates.find do |franchise|
          Current.set(franchise: franchise) do
            EmployeeProfile.coverage_configured? && EmployeeProfile.covers?(params[:postal_code], latitude: lat, longitude: lng)
          end
        end
        render json: (serving || candidates.first || Franchise.default).public_config
      end
    end
  end
end
