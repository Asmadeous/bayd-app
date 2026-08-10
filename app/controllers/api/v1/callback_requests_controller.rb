module Api
  module V1
    # Out-of-area enquiry: when no technician covers the customer's postal code,
    # instead of a dead end they can ask us to call back and check for a closer
    # tech. Staff work these from the admin dashboard.
    class CallbackRequestsController < ApplicationController
      skip_before_action :authenticate_user!, only: :create
      # Canada-only: same country gate as booking.
      before_action :enforce_canada!, only: :create

      def create
        cr = CallbackRequest.new(callback_request_params)
        cr.user = current_user if respond_to?(:current_user) && current_user
        cr.save!
        render json: { id: cr.id, status: cr.status }, status: :created
      end

      private

      def callback_request_params
        params.require(:callback_request).permit(
          :service_id, :postal_code, :contact_name, :contact_phone, :notes
        )
      end
    end
  end
end
