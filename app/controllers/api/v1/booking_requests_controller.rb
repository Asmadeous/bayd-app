module Api
  module V1
    class BookingRequestsController < ApplicationController
      def index
        records, meta = paginate(current_user.booking_requests.order(created_at: :desc))
        render json: { data: BookingRequestSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: BookingRequestSerializer.render_as_hash(scoped_request)
      end

      def create
        request_record = current_user.booking_requests.create!(booking_request_params)
        result = AssignmentService.new(request_record).call

        if result.success?
          booking = result.booking_request.booking
          apply_payment_choice(booking)
          subscription = maybe_start_subscription(booking)
          payment = collect_initial_payment(booking)
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            booking:         BookingSerializer.render_as_hash(booking),
            subscription_id: subscription&.id,
            payment:         payment
          }, status: :created
        else
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            error:           error_message(result.error)
          }, status: :unprocessable_entity
        end
      end

      private

      # Persist the customer's payment choice + "booking for a loved one" details.
      def apply_payment_choice(booking)
        rp = params[:booking_request] || params
        timing = rp[:payment_timing].to_s.presence_in(%w[pay_upfront pay_after]) || "pay_after"
        attrs = { payment_timing: timing,
                  booked_for_name: rp[:booked_for_name].presence,
                  booked_for_phone: rp[:booked_for_phone].presence }
        attrs[:deposit_amount] = booking.required_deposit if booking.client_type_group?
        booking.update!(attrs)
      end

      # Collect money now when appropriate:
      #   • group booking  → collect the deposit (admin % of total)
      #   • pay_upfront    → collect the full total
      #   • pay_after      → collect nothing now
      # Returns a hash the client uses to open a link or confirm the charge.
      def collect_initial_payment(booking)
        amount =
          if booking.client_type_group? then booking.required_deposit
          elsif booking.timing_pay_upfront? then booking.total
          else 0
          end
        return { mode: "none" } if amount.to_d <= 0

        tip = (params.dig(:booking_request, :tip) || params[:tip]).to_d
        result = BookingPaymentService.new(booking).collect(amount: amount, tip: tip)
        return { mode: "error", error: result.error } unless result.success?

        { mode: result.mode.to_s, url: result.url }.compact
      end

      # If the customer opted into recurrence, start a subscription seeded from
      # the first booking. Frequency is unit (day/week/month/year) + count.
      def maybe_start_subscription(booking)
        rp = params[:booking_request] || params
        return unless booking
        return unless ActiveModel::Type::Boolean.new.cast(rp[:recurrence_active])

        unit  = rp[:recurrence_interval_unit].to_s.presence_in(Subscription::UNITS) || "week"
        count = rp[:recurrence_interval_count].to_i
        return unless count.positive?

        Subscription.start_from(
          booking,
          interval_unit: unit,
          interval_count: count,
          auto_charge: ActiveModel::Type::Boolean.new.cast(rp[:auto_charge])
        )
      end

      ERROR_MESSAGES = {
        no_coverage:     "Sorry, that address is outside our service area.",
        no_availability: "No technician is available for that time. Please try another slot.",
        outside_hours:   "Please choose a time within our hours (10:00 AM–7:00 PM ET) that allows the full service to finish before close.",
        failed:          "We couldn't complete your booking. Please try again."
      }.freeze

      def error_message(code)
        ERROR_MESSAGES.fetch(code&.to_sym, "We couldn't complete your booking. Please try again.")
      end

      def scoped_request = current_user.booking_requests.find(params[:id])

      def booking_request_params
        params.require(:booking_request).permit(
          :service_id, :address_id, :kind, :client_type,
          :requested_start, :requested_window_end,
          :customer_latitude, :customer_longitude,
          :recurrence_interval_weeks, :recurrence_active, :auto_charge,
          :payment_timing, :booked_for_name, :booked_for_phone, :tip
        )
      end
    end
  end
end
