module Api
  module V1
    # Public "do we serve this postal code?" check, in the current franchise:
    # each provider's postal prefixes (FSAs in Canada) or their radius. Run by
    # the booking form before sending a customer down the booking flow.
    class CoverageController < ApplicationController
      skip_before_action :authenticate_user!

      def show
        return render json: { error: "postal_code is required" }, status: :bad_request if params[:postal_code].blank?

        fsa = PostalCode.area(params[:postal_code])
        if fsa.blank?
          return render json: { error: "That doesn't look like a valid postal code" }, status: :unprocessable_entity
        end

        configured = EmployeeProfile.coverage_configured?
        lat = params[:latitude].presence&.to_f
        lng = params[:longitude].presence&.to_f
        providers = EmployeeProfile.active.includes(:user)
                                   .select { |ep| ep.serves_location?(postal_code: params[:postal_code], latitude: lat, longitude: lng) }

        render json: {
          fsa: fsa,
          covered: configured ? providers.any? : true,
          unrestricted: !configured,
          providers: providers.map { |ep| provider_name(ep) }
        }
      end

      private

      def provider_name(profile)
        profile.user&.first_name.presence ||
          profile.title.presence || "Our team"
      end
    end
  end
end
