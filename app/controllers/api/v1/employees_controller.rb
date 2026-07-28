module Api
  module V1
    class EmployeesController < ApplicationController
      before_action :require_employee!

      def show
        render json: EmployeeProfileSerializer.render_as_hash(profile)
      end

      def update
        profile.update!(profile_params)
        render json: EmployeeProfileSerializer.render_as_hash(profile)
      end

      def toggle_shift
        profile.update!(on_shift: !profile.on_shift)
        render json: { on_shift: profile.on_shift }
      end

      def schedule
        records, meta = paginate(
          profile.bookings.active.order(:starts_at).includes(:user, :service)
        )
        render json: { data: BookingSerializer.render_as_hash(records), pagination: meta }
      end

      def reviews
        records, meta = paginate(
          profile.reviews.includes(:user, :employee_profile).order(created_at: :desc)
        )
        render json: { data: ReviewSerializer.render_as_hash(records), pagination: meta }
      end

      # ── Time clock ──────────────────────────────────────────────────────────

      def clock_in
        shift = TimeClock.clock_in(profile, **location_params)
        render json: ShiftSerializer.render_as_hash(shift), status: :created
      rescue TimeClock::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def clock_out
        shift = TimeClock.clock_out(profile, **location_params)
        render json: ShiftSerializer.render_as_hash(shift)
      rescue TimeClock::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def current_shift
        shift = profile.current_shift
        render json: shift ? ShiftSerializer.render_as_hash(shift) : nil
      end

      def shifts
        records, meta = paginate(profile.shifts.recent)
        totals = shift_totals(profile.shifts)
        render json: { data: ShiftSerializer.render_as_hash(records), totals: totals, pagination: meta }
      end

      private

      def location_params
        p = params.permit(:latitude, :longitude, :accuracy_meters)
        raise TimeClock::Error, "latitude and longitude are required" if p[:latitude].blank? || p[:longitude].blank?
        {
          latitude: p[:latitude].to_f,
          longitude: p[:longitude].to_f,
          accuracy_meters: p[:accuracy_meters].presence&.to_i
        }
      end

      def shift_totals(scope)
        {
          distance_km: scope.sum(:distance_km).to_f.round(3),
          fuel_reimbursement: scope.sum(:fuel_reimbursement).to_f.round(2)
        }
      end

      def profile
        @profile ||= current_user.employee_profile || raise(ActiveRecord::RecordNotFound, "No employee profile")
      end

      def profile_params
        params.require(:employee).permit(:title, :bio, :photo_url)
      end
    end
  end
end
