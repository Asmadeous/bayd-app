module Api
  module V1
    class EmployeesController < ApplicationController
      include ImageUploadValidation

      # Raised when a staff-typed booking address can't be geocoded — the booking
      # is rejected rather than created without coordinates.
      class ManualAddressError < StandardError; end

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
        # Default: the working schedule (active jobs, soonest first). filter=past
        # returns the tech's job history (completed / cancelled / no-show), most
        # recent first, so they can review previous bookings.
        scope = params[:filter] == "past" ? profile.bookings.past.order(starts_at: :desc)
                                          : profile.bookings.active.order(:starts_at)
        records, meta = paginate(scope.includes(:user, :service, :address, :partner, :tips, :shifts))
        render json: { data: BookingSerializer.render_as_hash(records), pagination: meta }
      end

      # A single one of the tech's OWN bookings (for the navigate / call screens).
      # Scoped to profile.bookings so a tech can only read their assigned jobs —
      # the customer GET /bookings/:id is scoped to the customer and returns
      # nothing for a staff user.
      def booking
        record = profile.bookings.includes(:user, :service, :address, :partner, :tips, :shifts).find(params[:id])
        render json: BookingSerializer.render_as_hash(record)
      end

      def reviews
        records, meta = paginate(
          profile.reviews.includes(:user, :employee_profile).order(created_at: :desc)
        )
        render json: { data: ReviewSerializer.render_as_hash(records), pagination: meta }
      end

      # ── Earnings / transactions ─────────────────────────────────────────────
      # The tech's own money — rendered ACCORDING TO ACCOUNT TYPE, the two never
      # mix:
      #   • Partner provider → their compensation is the partner payout at the
      #     platform-fee split (owed + settled). They are NOT reimbursed for fuel
      #     and do not see individual tip/fuel lines — that all flows through the
      #     partner. Only the partner block is returned.
      #   • Direct (solo) staff → paid individually: card tips owed (business is
      #     holding) + paid out, and fuel/mileage reimbursement. No partner block.
      def earnings
        if profile.partner_provider?
          partner = profile.partner
          pending = partner.pending_earnings
          render json: {
            account_type: "partner",
            partner: {
              name:             partner.name,
              platform_fee_pct: partner.platform_fee_pct,
              share_pct:        partner.partner_share_pct,
              owed:             pending[:owed],
              gross_unsettled:  pending[:gross],
              unsettled_count:  pending[:booking_count],
              paid_out:         partner.partner_payouts.status_paid.sum(:amount)
            }
          }
        else
          render json: {
            account_type: "direct",
            tips: {
              owed:     profile.tips.owed_to_tech.sum(:amount),
              paid_out: profile.tips.where(status: "paid_out").sum(:amount)
            },
            fuel_reimbursement: profile.shifts.sum(:fuel_reimbursement).to_f.round(2)
          }
        end
      end

      # ── Time clock ──────────────────────────────────────────────────────────

      # Clock in ON a specific booking: enforces the 150m geofence + 15-min grace.
      def clock_in
        booking = profile.bookings.find(params[:id])
        shift = TimeClock.clock_in(profile, booking: booking, **location_params)
        render json: ShiftSerializer.render_as_hash(shift), status: :created
      rescue TimeClock::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def clock_out
        booking = profile.bookings.find(params[:id])
        shift = TimeClock.clock_out(profile, booking: booking, **location_params)
        render json: ShiftSerializer.render_as_hash(shift)
      rescue TimeClock::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # Client didn't show / wasn't available for service. Only meaningful before
      # the job is done, so guard against a completed booking. The status change
      # fires NoShowChargeJob (charges the no-show fee to the card on file).
      def mark_no_show
        booking = profile.bookings.find(params[:id])
        if booking.completed? || booking.cancelled?
          return render json: { error: "This booking is already #{booking.status}." }, status: :unprocessable_entity
        end

        booking.update!(status: :no_show)
        render json: BookingSerializer.render_as_hash(booking.reload)
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
        # Charging is gated behind the clock: a tech can't charge a client before
        # they've actually started (clocked into) the job.
        unless booking.in_progress? || booking.completed?
          return render json: { error: "Clock in to this appointment before charging." }, status: :unprocessable_entity
        end

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

      # ── In-person POS payment (Square Tap to Pay) ───────────────────────────
      # The native Square Mobile Payments SDK takes the tap ON THE DEVICE and
      # returns a completed Square payment id. This endpoint RECORDS that payment
      # against the booking — it does NOT charge (the SDK already did). We verify
      # the payment id with Square (real, approved, right amount) so a client
      # can't spoof one, then settle the booking. Gated behind clock-in, like any
      # other charge.
      # Init params for the native Square Tap to Pay SDK. The app id, location id,
      # and environment are not secrets. The SDK's authorize() also needs an OAuth
      # access token; Square's mobile model has the SERVER hand it to the device at
      # authorize time (it is not stored in the app bundle). This endpoint is
      # staff-authenticated and TLS-only. If/when a dedicated, short-lived,
      # payments-scoped OAuth token is minted per device, return THAT here instead
      # of the account token — see docs/square-tap-to-pay.md.
      def pos_config
        render json: SquareService.pos_config.merge(access_token: SquareService.pos_access_token)
      end

      def pos_payment
        booking = profile.bookings.find(params[:id])
        payment_id = params[:square_payment_id].to_s.strip
        amount = params[:amount].to_d

        return render json: { error: "A completed payment id is required." }, status: :unprocessable_entity if payment_id.blank?
        return render json: { error: "Enter a valid amount." }, status: :unprocessable_entity unless amount.positive?
        unless booking.in_progress? || booking.completed?
          return render json: { error: "Clock in to this appointment before charging." }, status: :unprocessable_entity
        end

        # Confirm the tap actually happened and cleared, for the amount claimed.
        payment = SquareService.get_payment(payment_id)
        unless pos_payment_valid?(payment, amount)
          return render json: { error: "That payment couldn't be verified with Square." }, status: :unprocessable_entity
        end

        booking.mark_paid!(processor: "square_pos", reference: payment_id, amount: amount)
        render json: BookingSerializer.render_as_hash(booking.reload)
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

        # Add-ons: extra services the SAME tech performs in this visit. AddonBooker
        # validates each against employee_services + category, stamps raw["addons"],
        # and returns priced entries. Their price + duration fold into this one
        # booking (the tech charges the combined total on the day).
        addons = AddonBooker.new(booking, params[:addon_service_ids]).call
        if addons.any?
          extra_minutes = addons.addons.sum { |a| a[:duration].to_i }
          booking.update!(
            subtotal: booking.subtotal + addons.total,
            total:    booking.total + addons.total,
            ends_at:  booking.ends_at + extra_minutes.minutes
          )
        end

        render json: BookingSerializer.render_as_hash(booking.reload).merge(
          addons: addons.addons, addon_failures: addons.failures
        ), status: :created
      rescue ManualAddressError => e
        render json: { error: e.message }, status: :unprocessable_entity
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
        # Address auto-geocodes on save (geocoded_by :full_address). A booking MUST
        # have coordinates (the tech navigates to them, travel feasibility needs
        # them), so if the geocode couldn't resolve the address, reject the booking
        # loudly rather than create a broken, un-navigable one.
        address = client.addresses.create!(ap.merge(default: client.addresses.none?))
        if address.latitude.blank? || address.longitude.blank?
          raise ManualAddressError, "Couldn't locate that address. Check the street, city, and postal code."
        end
        address
      end


      # A Square payment is a valid POS settlement when it exists, has cleared,
      # and its amount matches what the tech is recording (guards against a
      # spoofed or wrong-amount payment id). Square amounts are in cents.
      def pos_payment_valid?(payment, amount)
        return false if payment.blank?
        return false unless %w[COMPLETED APPROVED CAPTURED].include?(payment["status"].to_s.upcase)

        paid_cents = payment.dig("amount_money", "amount").to_i
        paid_cents == (amount * 100).round
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
        closed   = scope.where(status: "closed")
        count    = closed.count
        on_time  = closed.where(arrived_late: false).count
        seconds  = closed.filter_map { |s| s.duration_seconds }.sum
        {
          shifts_count: count,
          hours_worked: (seconds / 3600.0).round(2),
          distance_km: scope.sum(:distance_km).to_f.round(3),
          fuel_reimbursement: scope.sum(:fuel_reimbursement).to_f.round(2),
          on_time_arrivals: on_time,
          late_arrivals: count - on_time,
          on_time_rate: count.positive? ? (on_time * 100.0 / count).round : nil
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
