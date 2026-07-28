module Api
  module V1
    class GiftCardsController < ApplicationController
      # Gift cards the current user has purchased.
      def index
        cards = current_user.gift_cards.order(created_at: :desc)
        render json: { data: GiftCardSerializer.render_as_hash(cards) }
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
