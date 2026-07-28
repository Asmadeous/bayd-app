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
        SimplyBook::Client.new.cancel_booking(booking.simplybook_id) if booking.simplybook_id
        render json: BookingSerializer.render_as_hash(booking)
      end

      private

      def scoped_booking = current_user.bookings.find(params[:id])
    end
  end
end
