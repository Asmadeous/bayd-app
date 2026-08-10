module Api
  module V1
    # Public country gate. Lets the booking UI show an upfront "Canada only"
    # message; the actual enforcement lives in enforce_canada! on the create
    # actions. Returns { allowed:, country: }.
    class GeoController < ApplicationController
      skip_before_action :authenticate_user!, only: :show

      def show
        render json: {
          allowed: GeoGate.allowed?(request),
          country: GeoGate.country_for(request)
        }
      end
    end
  end
end
