module Api
  module V1
    module Admin
      class BookingsController < BaseController
        def index
          scope = Booking.includes(:user, :employee_profile, :service).order(starts_at: :desc)
          scope = scope.where(status: params[:status])       if params[:status].present?
          scope = scope.where(employee_profile_id: params[:employee_id]) if params[:employee_id].present?
          records, meta = paginate(scope)
          render json: { data: BookingSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: BookingSerializer.render_as_hash(Booking.find(params[:id]))
        end

        def update
          booking = Booking.find(params[:id])
          booking.update!(status: params[:status], cancellation_reason: params[:cancellation_reason])
          render json: BookingSerializer.render_as_hash(booking)
        end

        def destroy
          Booking.find(params[:id]).destroy!
          head :no_content
        end

        # Staff-triggered collection for an agreed amount (e.g. negotiated
        # out-of-area travel fee, or after-service balance). Auto-charges an
        # existing customer's card, or returns a payment link for a new one.
        def payment_link
          booking = Booking.find(params[:id])
          amount  = params[:amount].present? ? params[:amount].to_d : booking.outstanding_balance
          result  = BookingPaymentService.new(booking).collect(
            amount: amount, tip: params[:tip].to_d, gift_card_code: params[:gift_card_code]
          )

          if result.success?
            render json: { mode: result.mode.to_s, url: result.url }
          else
            render json: { error: result.error }, status: :unprocessable_entity
          end
        end
      end
    end
  end
end
