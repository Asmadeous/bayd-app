module Api
  module V1
    class AddressesController < ApplicationController
      def index
        render json: AddressSerializer.render_as_hash(current_user.addresses)
      end

      def create
        address = current_user.addresses.create!(address_params)
        render json: AddressSerializer.render_as_hash(address), status: :created
      end

      def update
        scoped_address.update!(address_params)
        render json: AddressSerializer.render_as_hash(scoped_address)
      end

      def destroy
        scoped_address.destroy!
        head :no_content
      end

      private

      def scoped_address = current_user.addresses.find(params[:id])

      def address_params
        params.require(:address).permit(:label, :line1, :line2, :city, :province, :postal_code, :default, :is_apartment, :buzz_code)
      end
    end
  end
end
