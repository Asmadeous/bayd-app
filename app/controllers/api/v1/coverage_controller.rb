module Api
  module V1
    # Public "do we serve this postal code?" check. Matches on the FSA (first 3
    # characters) against each provider's coverage list. Run by the booking form
    # before sending a customer down the booking flow.
    class CoverageController < ApplicationController
      skip_before_action :authenticate_user!

      def show
        return render json: { error: "postal_code is required" }, status: :bad_request if params[:postal_code].blank?

        fsa = PostalCode.fsa(params[:postal_code])
        if fsa.blank?
          return render json: { error: "That doesn't look like a valid postal code" }, status: :unprocessable_entity
        end

        configured = EmployeeProfile.coverage_configured?
        providers = EmployeeProfile.active.serving_fsa(fsa).includes(:user)

        render json: {
          fsa: fsa,
          covered: configured ? providers.exists? : true,
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
