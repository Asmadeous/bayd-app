module Api
  module V1
    class InboundFormsController < ApplicationController
      skip_before_action :authenticate_user!

      def franchise
        FranchiseInquiry.create!(franchise_params)
        render json: { message: "Thank you for your inquiry." }, status: :created
      end

      def job
        JobApplication.create!(job_params)
        render json: { message: "Application received." }, status: :created
      end

      def contact
        ContactMessage.create!(contact_params)
        render json: { message: "Message received." }, status: :created
      end

      private

      def franchise_params = params.require(:inquiry).permit(:name, :email, :phone, :city, :message)
      def job_params        = params.require(:application).permit(:name, :email, :phone, :role_applied_for, :message, :resume_url)
      def contact_params    = params.require(:message).permit(:name, :email, :message)
    end
  end
end
