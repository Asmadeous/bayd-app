module Api
  module V1
    module Admin
      class GiftCardsController < BaseController
        def index
          scope = GiftCard.includes(:purchaser).order(created_at: :desc)
          scope = scope.where(active: params[:active] == "true") if params[:active].present?
          records, meta = paginate(scope)
          render json: { data: GiftCardSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: GiftCardSerializer.render_as_hash(GiftCard.find(params[:id]))
        end

        def create
          balance = params[:initial_balance]
          card = GiftCard.create!(
            code:            params[:code].presence, # model assigns BAYD-<uuid> when blank
            initial_balance: balance,
            current_balance: balance,
            expires_at:      params[:expires_at],
            recipient_email: params[:recipient_email],
            recipient_name:  params[:recipient_name],
            sender_name:     params[:sender_name],
            message:         params[:message],
            purchaser_id:    params[:purchaser_id],
            active:          true
          )
          render json: GiftCardSerializer.render_as_hash(card), status: :created
        end

        def update
          card = GiftCard.find(params[:id])
          card.update!(params.permit(:active, :expires_at, :current_balance,
                                     :recipient_email, :recipient_name, :sender_name, :message))
          render json: GiftCardSerializer.render_as_hash(card)
        end

        def destroy
          GiftCard.find(params[:id]).destroy!
          head :no_content
        end

        # Send (or re-send) the designed card + code to its recipient.
        def deliver
          card = GiftCard.find(params[:id])
          if card.recipient_email.blank? && card.purchaser&.email.blank?
            return render json: { error: "No recipient email on this card" }, status: :unprocessable_entity
          end

          card.deliver!
          render json: GiftCardSerializer.render_as_hash(card)
        end

        # Staff top-up: payment was taken in person (POS terminal / cash), so we
        # credit the balance immediately — this IS the "mark as paid" step.
        def topup
          card   = GiftCard.find(params[:id])
          method = params[:method].presence || "pos"
          card.topup!(params[:amount], method: method)
          render json: GiftCardSerializer.render_as_hash(card.reload)
        rescue RuntimeError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
