module Api
  module V1
    class BookingRequestsController < ApplicationController
      include BookingIntake

      # Booking is available to guests — no login required to book a service.
      skip_before_action :authenticate_user!, only: :create

      def index
        records, meta = paginate(current_user.booking_requests.order(created_at: :desc))
        render json: { data: BookingRequestSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: BookingRequestSerializer.render_as_hash(scoped_request)
      end

      def create
        # Email is required for the automated path: a booking is email-keyed
        # (the customer's account + notifications need an email), so a phone-only
        # guest can't be fully booked online. Instead, capture a follow-up
        # request and let an admin call + book manually. Logged-in
        # users always have an email, so this only affects guests.
        return create_follow_up_request if guest_without_email?

        booker = current_user || find_or_create_customer(params.require(:customer))
        # These are Booking-level concerns (read from raw params by
        # apply_payment_choice / collect_initial_payment), not BookingRequest columns.
        attrs = booking_request_params.except(:payment_timing, :booked_for_name, :booked_for_phone, :tip, :gift_card_code, :addon_service_ids)
        # The customer picks a wall-clock time in the business's timezone (Toronto);
        # the app runs in UTC. Interpret the naive "YYYY-MM-DDTHH:MM:SS" string as
        # Toronto time so the stored instant is correct (no 4-hour UTC skew).
        attrs[:requested_start] = BusinessHours.parse_local(attrs[:requested_start]) || attrs[:requested_start] if attrs[:requested_start].present?
        # Not-logged-in customers (and logged-in users) may pass the address inline.
        attrs[:address_id] = build_address!(booker).id if attrs[:address_id].blank? && params[:address].present?

        request_record = booker.booking_requests.create!(attrs)
        # Add-ons are resolved inside AssignmentService. They are NOT a separate
        # booking — just extra services noted for the tech to factor in on the
        # day; their price folds into the one combined charge.
        result = AssignmentService.new(
          request_record,
          addon_service_ids: params.dig(:booking_request, :addon_service_ids),
          payment_timing: chosen_payment_timing
        ).call

        if result.success?
          booking = result.booking_request.booking
          apply_payment_choice(booking)
          addon_result = result.addons
          notify_admin_addons(booking, addon_result) if addon_result&.any?
          subscription = maybe_start_subscription(booking)
          # Add-on prices are already folded into booking.total by AddonBooker, so
          # collect_initial_payment charges the correct combined amount - no extra.
          payment = collect_initial_payment(booking)
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            booking:         BookingSerializer.render_as_hash(booking),
            addons:          addon_result&.addons || [],
            addon_failures:  addon_result&.failures || [],
            subscription_id: subscription&.id,
            payment:         payment
          }, status: :created
        else
          render json: {
            booking_request: BookingRequestSerializer.render_as_hash(result.booking_request),
            code:            result.error,                       # e.g. "no_coverage" → frontend routes to consultation
            error:           error_message(result.error)
          }, status: :unprocessable_entity
        end
      end

      private

      # Persist the customer's payment choice + "booking for a loved one" details.
      # The customer's pay-now vs pay-later choice, normalized. Read before
      # assignment (to decide whether the booking waits for payment) AND when
      # persisting it, so both agree on one value.
      def chosen_payment_timing
        rp = params[:booking_request] || params
        rp[:payment_timing].to_s.presence_in(%w[pay_upfront pay_after]) || "pay_after"
      end

      def apply_payment_choice(booking)
        rp = params[:booking_request] || params
        attrs = { payment_timing: chosen_payment_timing,
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
      # booking.total already includes any add-on prices (AddonBooker folds them
      # in), so the "full total" here is the whole combined visit - one charge.
      def collect_initial_payment(booking)
        amount =
          if booking.client_type_group? then (group_charge_full? ? booking.total : booking.required_deposit)
          elsif booking.timing_pay_upfront? then booking.total
          else 0
          end

        tip = (params.dig(:booking_request, :tip) || params[:tip]).to_d
        gift_card_code = params.dig(:booking_request, :gift_card_code) || params[:gift_card_code]

        # Collect if there's a service amount now OR a tip. A tip is money the
        # customer chose to give the tech - it must NOT be dropped just because the
        # booking is pay-after (amount 0). Only bail when there's truly nothing.
        return { mode: "none" } if amount.to_d <= 0 && tip <= 0

        result = BookingPaymentService.new(booking).collect(amount: amount, tip: tip, gift_card_code: gift_card_code)
        return { mode: "error", error: result.error } unless result.success?

        # Optional payment (non-group pay-now): the booking stands regardless, so
        # tell admin a payment is pending. Group payment is mandatory and gates
        # the booking via the pending→confirmed hold, so no notice needed there.
        notify_admin_pending_payment(booking) if result.mode == :link && !booking.client_type_group?

        { mode: result.mode.to_s, url: result.url }.compact
      end

      # "full" → charge the whole group total now; otherwise just the deposit.
      def group_charge_full?
        (params.dig(:booking_request, :group_charge) || params[:group_charge]).to_s == "full"
      end

      # Email the team the add-ons the customer requested for this visit, so they
      # factor in the extra time/charge. Add-ons are note-only (no separate
      # booking) — this email is how the team learns about them. Best-effort:
      # never breaks the customer's booking.
      def notify_admin_addons(booking, addon_result)
        AdminMailer.booking_addons(booking, addon_result.addons).deliver_later
      rescue StandardError => e
        Rails.logger.warn("[BookingRequests] admin add-on notice failed: #{e.message}")
      end

      def notify_admin_pending_payment(booking)
        User.franchise_admins.find_each do |admin|
          Notification.create!(
            user: admin, kind: "payment_pending",
            title: "Payment pending — booking ##{booking.id}",
            body: "#{booking.user.first_name} chose to pay now; the payment link is still pending. The booking is confirmed regardless."
          )
        end
      rescue StandardError => e
        Rails.logger.warn("[BookingRequests] admin payment notice failed: #{e.message}")
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
        slot_taken:      "That time was just booked. Please choose another slot.",
        outside_hours:   "Please choose a time within our hours (9:00 AM–7:00 PM ET) that allows the full service to finish before close.",
        failed:          "We couldn't complete your booking. Please try again."
      }.freeze

      def error_message(code)
        ERROR_MESSAGES.fetch(code&.to_sym, "We couldn't complete your booking. Please try again.")
      end

      def scoped_request = current_user.booking_requests.find(params[:id])

      def intake_params = params[:booking_request] || {}
      def intake_service_ids = [ intake_params[:service_id] ].compact_blank

      def booking_request_params
        params.require(:booking_request).permit(
          :service_id, :address_id, :kind, :client_type, :requested_employee_id, :party_size,
          :requested_start, :requested_window_end,
          :customer_latitude, :customer_longitude,
          :recurrence_interval_weeks, :recurrence_active, :auto_charge,
          :payment_timing, :booked_for_name, :booked_for_phone, :tip, :gift_card_code,
          addon_service_ids: []
        )
      end
    end
  end
end
