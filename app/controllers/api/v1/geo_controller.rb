module Api
  module V1
    # Public country gate. Lets the booking UI show an upfront "Canada only"
    # message; the actual enforcement lives in enforce_canada! on the create
    # actions. Returns { allowed:, country: }.
    class GeoController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[show verify_address]

      # Canadian postal code: "A1A 1A1" (space optional). Excludes letters that
      # Canada Post never uses (D, F, I, O, Q, U in the first letter; W, Z lead).
      CA_POSTAL = /\A[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ ]?\d[ABCEGHJ-NPRSTV-Z]\d\z/i

      def show
        render json: {
          allowed: GeoGate.allowed?(request),
          country: GeoGate.country_for(request)
        }
      end

      # Geocode the typed address and confirm it's a real Canadian address before
      # the booking form lets the user proceed. Returns:
      #   { valid:, in_canada:, postal_format_ok:, formatted:, city:, error: }
      # `valid` is the single flag the frontend gates on: postal format is a real
      # Canadian code AND Google resolves the address to a place in Canada.
      def verify_address
        postal = params[:postal_code].to_s.strip
        query  = [ params[:line1], params[:city], params[:province], postal ]
                 .map { |v| v.to_s.strip.presence }.compact.join(", ")

        postal_ok = CA_POSTAL.match?(postal)

        result    = query.present? ? Geocoder.search(query).first : nil
        in_canada = result.present? && country_code_of(result) == "CA"

        coords = in_canada ? (result.coordinates rescue nil) : nil
        render json: {
          valid:            postal_ok && in_canada,
          in_canada:        in_canada,
          postal_format_ok: postal_ok,
          formatted:        (result&.address if in_canada),
          city:             (result&.city rescue nil),
          # Geocoded coordinates — the booking form feeds these back to the
          # availability query so travel-infeasible slots are filtered out.
          latitude:         coords&.first,
          longitude:        coords&.last
        }
      rescue StandardError => e
        Rails.logger.warn("[GeoController#verify_address] #{e.class}: #{e.message}")
        # Geocoder unreachable → don't hard-block the customer; let the postal
        # format alone gate, and the backend still enforces Canada on create.
        render json: { valid: postal_ok, in_canada: false, postal_format_ok: postal_ok, error: "geocode_unavailable" }
      end

      private

      def country_code_of(result)
        (result.country_code.presence || result.data.dig("address_components")
          &.find { |c| Array(c["types"]).include?("country") }&.dig("short_name")).to_s.upcase
      rescue StandardError
        nil
      end
    end
  end
end
