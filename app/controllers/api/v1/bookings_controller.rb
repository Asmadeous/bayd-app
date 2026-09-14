module Api
  module V1
    class BookingsController < ApplicationController
      def index
        scope = current_user.bookings
                            .includes(:service, :review, employee_profile: :user)
                            .order(starts_at: :desc)
        records, meta = paginate(scope)
        render json: { data: BookingSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: BookingSerializer.render_as_hash(scoped_booking)
      end

      def cancel
        booking = scoped_booking
        booking.update!(status: :cancelled, cancellation_reason: params[:reason])
        render json: BookingSerializer.render_as_hash(booking)
      end

      # Customer self-reschedule. Gated: not within RESCHEDULE_CUTOFF_HOURS of the
      # start, and at most MAX_CUSTOMER_RESCHEDULES times per booking. Admins have
      # their own uncapped endpoint. Re-validates availability + travel + double-
      # booking via Booking#reschedule!.
      RESCHEDULE_CUTOFF_HOURS  = 24
      MAX_CUSTOMER_RESCHEDULES = 2

      def reschedule
        booking   = scoped_booking
        new_start = BusinessHours.parse_local(params[:starts_at])
        return render(json: { error: "A valid new date and time is required." }, status: :unprocessable_entity) if new_start.nil?

        if booking.starts_at <= RESCHEDULE_CUTOFF_HOURS.hours.from_now
          return render json: { error: "Reschedules must be at least #{RESCHEDULE_CUTOFF_HOURS} hours before your appointment. Please call us for last-minute changes." },
                        status: :unprocessable_entity
        end
        if booking.reschedule_count >= MAX_CUSTOMER_RESCHEDULES
          return render json: { error: "You've reached the reschedule limit for this booking. Please call us or cancel and rebook." },
                        status: :unprocessable_entity
        end

        booking.reschedule!(new_start: new_start, by_customer: true)
        render json: BookingSerializer.render_as_hash(booking)
      rescue Booking::RescheduleError => e
        render json: { error: reschedule_error_message(e.reason), code: e.reason },
               status: e.reason == :slot_taken ? :conflict : :unprocessable_entity
      end

      # Customer-triggered payment for a booking — the outstanding balance plus an
      # optional tip. Auto-charges the card on file, or returns a payment link.
      def pay
        booking = scoped_booking
        amount  = params[:amount].present? ? params[:amount].to_d : booking.outstanding_balance
        result  = BookingPaymentService.new(booking).collect(
          amount: amount, tip: params[:tip].to_d, gift_card_code: params[:gift_card_code]
        )

        if result.success?
          render json: { mode: result.mode.to_s, url: result.url,
                         booking: BookingSerializer.render_as_hash(booking.reload) }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      private

      def reschedule_error_message(reason)
        {
          not_reschedulable: "This booking can no longer be rescheduled.",
          outside_hours:     "Please choose a time within our hours (9:00 AM–7:00 PM ET) that allows the full service to finish before close.",
          not_reachable:     "Your technician can't reach that time given their other appointments. Please pick another slot.",
          slot_taken:        "That slot was just taken. Please pick another open time."
        }.fetch(reason, "We couldn't reschedule that booking. Please try again.")
      end

      def scoped_booking = current_user.bookings.find(params[:id])
    end
  end
end
