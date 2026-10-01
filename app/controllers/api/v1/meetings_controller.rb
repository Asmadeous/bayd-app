module Api
  module V1
    # Work-scope video call between a customer and the assigned technician.
    # Either party (or an admin) can start the call for a booking they're on.
    class MeetingsController < ApplicationController
      before_action :set_booking, only: :create
      before_action :set_meeting, only: %i[show update complete cancel]

      def show
        render json: MeetingSerializer.render_as_hash(@meeting)
      end

      # Idempotent: returns the booking's existing meeting or creates one.
      # scheduled_at is company-zone wall-clock ("2026-10-02T15:00"); now=true
      # starts it straight away.
      def create
        meeting = @booking.meeting || Meeting.create!(booking: @booking, scheduled_at: requested_time)
        render json: MeetingSerializer.render_as_hash(meeting), status: :created
      end

      # Move the call to a new time (either person on the booking, or an admin).
      def update
        at = requested_time
        return render(json: { error: "Pick a time for the call." }, status: :unprocessable_entity) unless at

        @meeting.reschedule!(at)
        render json: MeetingSerializer.render_as_hash(@meeting)
      end

      def complete
        @meeting.complete!
        render json: MeetingSerializer.render_as_hash(@meeting)
      end

      def cancel
        @meeting.cancel!
        render json: MeetingSerializer.render_as_hash(@meeting)
      end

      private

      def requested_time
        return Time.current if params[:now].to_s == "true"

        BusinessHours.parse_local(params[:scheduled_at])
      end

      def set_booking
        @booking = Booking.find(params[:booking_id])
        authorize_participant!(@booking)
      end

      def set_meeting
        @meeting = Meeting.find(params[:id])
        authorize_participant!(@meeting.booking)
      end

      def authorize_participant!(booking)
        return if current_user.admin?
        return if booking.user_id == current_user.id
        return if booking.employee_profile&.user_id == current_user.id

        forbidden
      end
    end
  end
end
