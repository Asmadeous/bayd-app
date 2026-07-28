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
          subscription = maybe_start_subscription(booking)
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            booking:         BookingSerializer.render_as_hash(booking),
            subscription_id: subscription&.id
          }, status: :created
        else
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            error:           error_message(result.error)
          }, status: :unprocessable_entity
        end
      end

      private

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
          :recurrence_interval_weeks, :recurrence_active, :auto_charge
        )
      end
    end
  end
end
