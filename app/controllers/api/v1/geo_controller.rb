module Api
  module V1
    # Public country gate. Lets the booking UI show an upfront "Canada only"
    # message; the actual enforcement lives in enforce_canada! on the create
    # actions. Returns { allowed:, country: }.
    class GeoController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[show verify_address autocomplete place_details]

      PLACES_BASE = "https://maps.googleapis.com".freeze

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

      # Address autocomplete: proxy Google Places Autocomplete so the Maps key
      # stays server-side. Canada-biased. Returns [{ description, place_id }].
      # Degrades to an empty list (never an error) so the input still works as a
      # plain field if Places is unavailable / not enabled on the key.
      def autocomplete
        input = params[:q].to_s.strip
        return render(json: { suggestions: [] }) if input.length < 3 || google_key.blank?

        resp = places_conn.get("/maps/api/place/autocomplete/json") do |req|
          req.params["input"]        = input
          req.params["key"]          = google_key
          req.params["components"]   = "country:ca"
          req.params["types"]        = "address"
          req.params["sessiontoken"] = params[:session].presence
        end
        body = JSON.parse(resp.body) rescue {}
        suggestions = Array(body["predictions"]).map do |p|
          { description: p["description"], place_id: p["place_id"] }
        end
        render json: { suggestions: suggestions }
      rescue StandardError => e
        Rails.logger.warn("[GeoController#autocomplete] #{e.class}: #{e.message}")
        render json: { suggestions: [] }
      end

      # Resolve a chosen place_id to structured address parts so every field
      # (street, city, province, postal) auto-fills from one pick, plus lat/lng.
      def place_details
        place_id = params[:place_id].to_s.strip
        return render(json: { error: "place_id required" }, status: :unprocessable_entity) if place_id.blank?
        return render(json: {}, status: :service_unavailable) if google_key.blank?

        resp = places_conn.get("/maps/api/place/details/json") do |req|
          req.params["place_id"]     = place_id
          req.params["key"]          = google_key
          req.params["fields"]       = "address_component,geometry,formatted_address"
          req.params["sessiontoken"] = params[:session].presence
        end
        body = JSON.parse(resp.body) rescue {}
        render json: parse_place(body["result"] || {})
      rescue StandardError => e
        Rails.logger.warn("[GeoController#place_details] #{e.class}: #{e.message}")
        render json: {}, status: :service_unavailable
      end

      private

      def google_key = ENV["GOOGLE_MAPS_API_KEY"].presence

      def places_conn
        @places_conn ||= Faraday.new(url: PLACES_BASE)
      end

      # Turn Google's address_components into the flat shape the address form uses.
      def parse_place(result)
        comps = Array(result["address_components"])
        get = lambda do |type|
          comps.find { |c| Array(c["types"]).include?(type) }
        end
        street_number = get.call("street_number")&.dig("long_name")
        route         = get.call("route")&.dig("long_name")
        loc = result.dig("geometry", "location") || {}

        {
          line1:       [ street_number, route ].compact.join(" ").presence,
          city:        (get.call("locality") || get.call("postal_town") || get.call("sublocality"))&.dig("long_name"),
          province:    get.call("administrative_area_level_1")&.dig("short_name"),
          postal_code: get.call("postal_code")&.dig("long_name"),
          country:     get.call("country")&.dig("short_name"),
          formatted:   result["formatted_address"],
          latitude:    loc["lat"],
          longitude:   loc["lng"]
        }
      end

      def country_code_of(result)
        (result.country_code.presence || result.data.dig("address_components")
          &.find { |c| Array(c["types"]).include?("country") }&.dig("short_name")).to_s.upcase
      rescue StandardError
        nil
      end
    end
  end
end
