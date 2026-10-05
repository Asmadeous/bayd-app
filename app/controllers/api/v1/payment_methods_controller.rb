module Api
  module V1
    # Customer's card-on-file for booking/subscription auto-charge — via Square.
    class PaymentMethodsController < ApplicationController
      def show
        render json: card_json(current_user)
      end

      # Save a card on file. `source_id` is a single-use token produced by the
      # Square Web Payments SDK on the frontend (no raw card data touches us).
      def create
        source_id = params[:source_id]
        return render json: { error: "Missing card token" }, status: :unprocessable_entity if source_id.blank?

        customer_id = current_user.square_customer_id.presence || create_customer!
        return if performed?

        result = SquareService.save_card(customer_id: customer_id, source_id: source_id)
        return render json: { error: result[:error] }, status: :unprocessable_entity unless result[:success]

        # Replace any previous card.
        SquareService.disable_card(current_user.square_card_id) if current_user.square_card_id.present?
        current_user.update!(
          square_card_id: result[:card_id], card_brand: result[:brand], card_last4: result[:last4]
        )
        render json: card_json(current_user), status: :created
      end

      def destroy
        SquareService.disable_card(current_user.square_card_id) if current_user.square_card_id.present?
        current_user.update!(square_card_id: nil, card_brand: nil, card_last4: nil)
        render json: card_json(current_user)
      end

      private

      def create_customer!
        result = SquareService.create_customer(current_user)
        unless result[:success]
          render json: { error: result[:error] }, status: :unprocessable_entity
          return
        end
        current_user.update!(square_customer_id: result[:customer_id])
        result[:customer_id]
      end

      def card_json(user)
        { has_card: user.card_on_file?, brand: user.card_brand, last4: user.card_last4 }
      end
    end
  end
end
