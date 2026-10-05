module Api
  module V1
    class GiftCardsController < ApplicationController
      AMOUNTS = [ 25, 50, 75, 100, 150 ].freeze

      # Gift cards the current user has purchased.
      def index
        cards = current_user.gift_cards.order(created_at: :desc)
        render json: { data: GiftCardSerializer.render_as_hash(cards) }
      end

      # Purchase a gift card. Creates it inactive, then starts a payment: a Helcim
      # checkout token (website), or a Square hosted page with gateway=square (the
      # apps, where Helcim's embedded window can't hold its session). The card is
      # activated + delivered by the payment webhook (GC-<id>).
      def create
        amount = params[:amount].to_i
        return render json: { error: "Choose $25, $50, $75, $100, or $150." }, status: :unprocessable_entity unless AMOUNTS.include?(amount)

        card = current_user.gift_cards.create!(
          initial_balance: amount, current_balance: amount, active: false,
          recipient_email: params[:recipient_email].presence,
          recipient_name:  params[:recipient_name].presence,
          sender_name:     params[:sender_name].presence,
          message:         params[:message].presence
        )

        payment = start_payment("GC-#{card.id}", amount, "Gift Card (#{ActiveSupport::NumberHelper.number_to_currency(amount)})")
        if payment[:error]
          card.destroy
          render json: { error: payment[:error] }, status: :unprocessable_entity
        else
          render json: payment.merge(gift_card_id: card.id), status: :created
        end
      end

      def show
        render json: GiftCardSerializer.render_as_hash(find_card)
      end

      # Online top-up by card (Helcim token, or Square page with gateway=square);
      # the balance is credited by the payment webhook (GCT-<id>).
      def topup
        card   = find_card
        amount = params[:amount].to_i
        return render json: { error: "Enter a valid amount." }, status: :unprocessable_entity unless amount.positive?

        payment = start_payment("GCT-#{card.id}", amount, "Gift Card Top-Up")
        if payment[:error]
          render json: { error: payment[:error] }, status: :unprocessable_entity
        else
          render json: payment.merge(gift_card_id: card.id)
        end
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

      # { gateway:, checkout_token: } or { gateway:, redirect_url: }, or { error: }.
      def start_payment(reference, amount, description)
        if params[:gateway].to_s == "square"
          link = SquareService.create_reference_link(
            reference: reference,
            line_items: [ { name: description, quantity: 1, price_cents: (amount * 100).to_i } ],
            redirect_url: "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/app/gift-cards"
          )
          return { error: link[:error] || "Could not start payment." } unless link[:success] && link[:url].present?

          { gateway: "square", redirect_url: link[:url] }
        else
          session = HelcimService.initialize_session(
            payment_type: "purchase", amount: amount.to_f, invoice_number: reference,
            line_items: [ { description: description, quantity: 1, price: amount.to_f } ]
          )
          return { error: session[:error] || "Could not start payment." } unless session[:success] && session[:checkout_token].present?

          { gateway: "helcim", checkout_token: session[:checkout_token] }
        end
      end

      def find_card
        # Route uses `param: :code`, so the value arrives as params[:code];
        # fall back to :id for safety.
        GiftCard.active.find_by!(code: params[:code] || params[:id])
      end
    end
  end
end
