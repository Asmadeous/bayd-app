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

        # Eligible technicians for this booking, ranked by distance to the job.
        # Uses each tech's live GPS (if fresh) or base location. Doesn't hard-
        # filter on shift/availability — it reports them so the admin can decide.
        def candidates
          booking = Booking.find(params[:id])
          lat = booking.service_latitude
          lng = booking.service_longitude
          fsa = booking.address&.postal_code

          pool = EmployeeProfile.active.dispatchable
                                .joins(:employee_services)
                                .where(employee_services: { service_id: booking.service_id })
                                .distinct.includes(:user, :employee_current_location)

          list = pool.map do |ep|
            source, elat, elng = staff_position(ep)
            distance =
              if lat && lng && elat && elng
                Geocoder::Calculations.distance_between([ lat.to_f, lng.to_f ], [ elat.to_f, elng.to_f ], units: :km).round(2)
              end
            {
              employee_profile_id: ep.id,
              name:                staff_name(ep),
              on_shift:            ep.on_shift,
              distance_km:         distance,
              location_source:     source,
              serves_area:         fsa.present? ? ep.serves_fsa?(fsa) : nil,
              available:           ep.available_at?(booking.starts_at, booking.ends_at),
              current:             ep.id == booking.employee_profile_id
            }
          end.sort_by { |c| c[:distance_km] || Float::INFINITY }

          render json: { booking_id: booking.id, candidates: list }
        end

        # Assign / reassign the booking to a technician. The no-double-booking DB
        # constraint prevents overlapping assignments.
        def assign
          booking = Booking.find(params[:id])
          EmployeeProfile.find(params[:employee_profile_id]) # 404 if missing
          booking.update!(employee_profile_id: params[:employee_profile_id])
          render json: BookingSerializer.render_as_hash(booking.reload)
        rescue ActiveRecord::RecordNotUnique, ActiveRecord::StatementInvalid
          render json: { error: "That technician already has an overlapping booking at this time." }, status: :unprocessable_entity
        end

        # Admin reschedule: move a booking to a new time, no cutoff and no
        # reschedule cap (unlike the customer endpoint). Optionally reassign to a
        # different technician in the same action via employee_profile_id.
        # Re-validates travel + double-booking and re-syncs SimplyBook.
        def reschedule
          booking   = Booking.find(params[:id])
          new_start = BusinessHours.parse_local(params[:starts_at])
          return render(json: { error: "A valid new date and time is required." }, status: :unprocessable_entity) if new_start.nil?

          new_employee = EmployeeProfile.find(params[:employee_profile_id]) if params[:employee_profile_id].present?
          booking.reschedule!(new_start: new_start, by_customer: false, new_employee: new_employee)
          render json: BookingSerializer.render_as_hash(booking.reload)
        rescue Booking::RescheduleError => e
          render json: { error: e.reason.to_s.humanize, code: e.reason },
                 status: e.reason == :slot_taken ? :conflict : :unprocessable_entity
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

        private

        # Live GPS if fresh, else the tech's base location.
        def staff_position(ep)
          loc = ep.employee_current_location
          if loc && ep.live_location_fresh?(staleness_threshold: 10.minutes)
            [ "live", loc.latitude, loc.longitude ]
          else
            [ "base", ep.base_latitude, ep.base_longitude ]
          end
        end

        def staff_name(ep)
          full = [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip
          full.presence || ep.user&.email
        end
      end
    end
  end
end
