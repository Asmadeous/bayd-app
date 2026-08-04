module Api
  module V1
    class GiftCardsController < ApplicationController
      AMOUNTS = [ 25, 50, 75, 100 ].freeze

      # Gift cards the current user has purchased.
      def index
        cards = current_user.gift_cards.order(created_at: :desc)
        render json: { data: GiftCardSerializer.render_as_hash(cards) }
      end

      # Purchase a gift card. Creates it inactive, then returns a Helcim checkout
      # token; the card is activated + delivered by the payment webhook (GC-<id>).
      def create
        amount = params[:amount].to_i
        return render json: { error: "Choose $25, $50, $75, or $100." }, status: :unprocessable_entity unless AMOUNTS.include?(amount)

        card = current_user.gift_cards.create!(
          initial_balance: amount, current_balance: amount, active: false,
          recipient_email: params[:recipient_email].presence,
          recipient_name:  params[:recipient_name].presence,
          sender_name:     params[:sender_name].presence,
          message:         params[:message].presence
        )

        session = HelcimService.initialize_session(
          payment_type: "purchase", amount: amount.to_f, invoice_number: "GC-#{card.id}"
        )
        if session[:success] && session[:checkout_token].present?
          render json: { gateway: "helcim", gift_card_id: card.id, checkout_token: session[:checkout_token] }, status: :created
        else
          card.destroy
          render json: { error: session[:error] || "Could not start payment." }, status: :unprocessable_entity
        end
      end

      def show
        render json: GiftCardSerializer.render_as_hash(find_card)
      end

      def redeem
        card    = find_card
        amount  = BigDecimal(params[:amount].to_s)
        booking = current_user.bookings.find_by(id: params[:booking_id])

        raise "Gift card is not redeemable" unless card.redeemable?
        card.redeem!(amount, booking: booking)

        render json: GiftCardSerializer.render_as_hash(card.reload)
      rescue RuntimeError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def find_card
        GiftCard.active.find_by!(code: params[:id])
      end
    end
  end
end
