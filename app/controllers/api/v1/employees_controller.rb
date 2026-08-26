module Api
  module V1
    class EmployeesController < ApplicationController
      include ImageUploadValidation

      before_action :require_employee!

      def show
        render json: EmployeeProfileSerializer.render_as_hash(profile)
      end

      def update
        if params[:photo].present? && !valid_image?(params[:photo])
          return render json: { error: "Photo must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        profile.update!(profile_params) if params[:employee].present?
        profile.photo.attach(params[:photo]) if params[:photo].present?
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

      # ── Overtime charge ─────────────────────────────────────────────────────
      # A service ran over its allocated time — staff add an extra amount. It's
      # added to the booking total and collected now: charged to the card on file
      # (incl. already-paid bookings), or a payment link for the difference.
      def booking_overtime
        booking = profile.bookings.find(params[:id])
        amount  = params[:amount].to_d
        return render json: { error: "Enter a valid amount." }, status: :unprocessable_entity unless amount.positive?

        reason = params[:reason].to_s.strip
        booking.update!(
          overtime_amount: booking.overtime_amount + amount,
          total:           booking.total + amount,
          notes:           [ booking.notes.presence, "Overtime +$#{amount}#{reason.present? ? " (#{reason})" : ''}" ].compact.join("\n")
        )

        result = BookingPaymentService.new(booking).collect(amount: amount, note: "Overtime BKG-#{booking.id}")
        if result.success?
          render json: { mode: result.mode.to_s, url: result.url, booking: BookingSerializer.render_as_hash(booking.reload) }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      # ── Staff-initiated manual booking (force-book) ─────────────────────────
      # A service provider books a client directly from their dashboard. This
      # skips AssignmentService's eligibility gates (coverage / operating hours /
      # on-shift / travel) — staff know what they're doing — but the DB
      # no_double_booking exclusion constraint still prevents a real time clash.
      # Defaults to the acting tech; an admin/tech may target another tech via
      # employee_id.
      def create_booking
        svc = Service.active.find(params.require(:service_id))
        target = booking_target_employee
        return forbidden if target.nil?

        starts_at = parse_start(params[:starts_at])
        return render json: { error: "A valid start time is required." }, status: :unprocessable_entity if starts_at.nil?

        client = find_or_create_customer(params.require(:customer))
        address = build_manual_address(client)
        qty = [ [ params[:party_size].to_i, 1 ].max, Service::GROUP_SIZE ].min
        price = svc.price_for(params[:client_type].presence || "adult") * qty

        booking = Booking.create!(
          user:             client,
          employee_profile: target,
          partner_id:       target.partner_id,
          service:          svc,
          address:          address,
          client_type:      params[:client_type].presence || "adult",
          party_size:       qty,
          status:           "confirmed",
          starts_at:        starts_at,
          ends_at:          starts_at + (svc.duration_minutes * qty).minutes,
          subtotal:         price,
          travel_fee:       0,
          total:            price,
          service_latitude:  address&.latitude,
          service_longitude: address&.longitude,
          notes:            [ "Booked by #{current_user.first_name || 'staff'}", params[:notes].presence ].compact.join(" — ")
        )

        render json: BookingSerializer.render_as_hash(booking), status: :created
      rescue ActiveRecord::RecordNotUnique, ActiveRecord::StatementInvalid => e
        raise unless e.is_a?(ActiveRecord::RecordNotUnique) || e.cause.is_a?(PG::ExclusionViolation)
        render json: { error: "That technician already has a booking at that time." }, status: :conflict
      end

      # ── Gift-card top-up at the customer (POS/cash) ─────────────────────────
      # Staff look up a customer's card by code and add funds; payment is taken
      # in person, so "mark paid" credits the balance immediately.
      def show_gift_card
        render json: GiftCardSerializer.render_as_hash(GiftCard.find_by!(code: params[:code]))
      end

      def topup_gift_card
        card = GiftCard.find_by!(code: params[:code])
        card.topup!(params[:amount], method: params[:method].presence || "pos")
        render json: GiftCardSerializer.render_as_hash(card.reload)
      rescue RuntimeError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      # The tech the booking is for: the acting tech by default; an explicit
      # employee_id is honoured (admins can book anyone; a tech only themselves).
      # Returns nil when a tech targets someone else (caller renders forbidden).
      def booking_target_employee
        return profile if params[:employee_id].blank?

        wanted = EmployeeProfile.find(params[:employee_id])
        return wanted if current_user.admin? || wanted.id == profile.id

        nil
      end

      # Staff enter the appointment time in the business's wall-clock zone; the
      # app stores UTC. Parse in the business zone so the stored instant is right.
      def parse_start(raw)
        BusinessHours.parse_local(raw)
      end

      # Optional inline address for the manual booking (staff type the client's
      # location). Reuses the customer's existing address when none is provided.
      def build_manual_address(client)
        return client.addresses.order(default: :desc, created_at: :desc).first if params[:address].blank?

        ap = params.require(:address).permit(
          :label, :line1, :line2, :city, :province, :postal_code,
          :latitude, :longitude, :is_apartment, :buzz_code
        )
        client.addresses.create!(ap.merge(default: client.addresses.none?))
      end

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
