module Api
  module V1
    # Customer's card on file with the current franchise's Square account, for
    # booking/subscription auto-charge.
    class PaymentMethodsController < ApplicationController
      def show
        render json: card_json
      end

      # Save a card on file. `source_id` is a single-use token produced by the
      # Square Web Payments SDK on the frontend (no raw card data touches us).
      def create
        source_id = params[:source_id]
        return render json: { error: "Missing card token" }, status: :unprocessable_entity if source_id.blank?

        profile = stored_profile
        profile.customer_ref = create_customer! if profile.customer_ref.blank?
        return if performed?

        result = gateway.save_card(customer_id: profile.customer_ref, source_id: source_id)
        return render json: { error: result[:error] }, status: :unprocessable_entity unless result[:success]

        # Replace any previous card.
        gateway.disable_card(profile.card_ref) if profile.card_ref.present?
        profile.update!(card_ref: result[:card_id], card_brand: result[:brand], card_last4: result[:last4])
        render json: card_json, status: :created
      end

      def destroy
        profile = stored_profile
        gateway.disable_card(profile.card_ref) if profile.card_ref.present?
        profile.update!(card_ref: nil, card_brand: nil, card_last4: nil) if profile.persisted?
        current_user.update!(square_card_id: nil, card_brand: nil, card_last4: nil) if current_user.square_card_id.present?
        render json: card_json
      end

      private

      def gateway = SquareService

      # The saved profile for this franchise (a card from before franchising is
      # moved into one the first time it's changed).
      def stored_profile
        profile = current_user.payment_profile
        return profile if profile&.persisted?

        franchise = Franchise.current
        current_user.payment_profiles.find_or_initialize_by(franchise: franchise).tap do |p|
          p.assign_attributes(profile.attributes.slice("customer_ref", "card_ref", "card_brand", "card_last4")) if profile
        end
      end

      def create_customer!
        result = gateway.create_customer(current_user)
        unless result[:success]
          render json: { error: result[:error] }, status: :unprocessable_entity
          return
        end
        result[:customer_id]
      end

      def card_json
        profile = current_user.reload.payment_profile
        { has_card: profile&.card_on_file? || false, brand: profile&.card_brand, last4: profile&.card_last4 }
      end
    end
  end
end
