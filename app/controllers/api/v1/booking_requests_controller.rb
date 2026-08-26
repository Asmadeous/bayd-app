module Api
  module V1
    class BookingRequestsController < ApplicationController
      # Booking is available to guests — no login required to book a service.
      skip_before_action :authenticate_user!, only: :create
      # Canada-only: reject requests from outside the country.
      before_action :enforce_canada!, only: :create

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
        result = AssignmentService.new(request_record, addon_service_ids: params.dig(:booking_request, :addon_service_ids)).call

        if result.success?
          booking = result.booking_request.booking
          apply_payment_choice(booking)
          addon_result = result.addons
          notify_admin_addons(booking, addon_result) if addon_result&.any?
          subscription = maybe_start_subscription(booking)
          payment = collect_initial_payment(booking, extra_amount: addon_result&.total || 0)
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

      # A guest (not logged in) who supplied no email. Their booking can't be
      # booked online (it's email-keyed), so it becomes an admin follow-up instead.
      def guest_without_email?
        return false if current_user

        params.dig(:customer, :email).to_s.strip.blank?
      end

      # Phone-only guest booking → capture a CallbackRequest with EVERYTHING the
      # admin needs to book manually (date/time, address, party, notes all go in
      # the free-text notes since CallbackRequest has no columns for them), then
      # notify the team by email + in-app. Renders a follow-up status the
      # frontend uses to show "we'll call you to confirm".
      def create_follow_up_request
        cust = params[:customer] || {}
        cr = CallbackRequest.create!(
          service_id:    params.dig(:booking_request, :service_id).presence,
          postal_code:   params.dig(:address, :postal_code).presence || cust[:postal_code].presence,
          contact_name:  [ cust[:first_name], cust[:last_name] ].compact_blank.join(" ").presence,
          contact_phone: cust[:phone].presence,
          notes:         follow_up_notes,
          status:        "new"
        )
        notify_admin_follow_up(cr)
        render json: { status: "follow_up", callback_request_id: cr.id }, status: :created
      end

      # Everything the admin needs to book manually, formatted into one text
      # block (CallbackRequest has no date/time/address columns).
      def follow_up_notes
        br = params[:booking_request] || {}
        ad = params[:address] || {}
        addr = [ ad[:line1], ad[:line2], ad[:city], ad[:province], ad[:postal_code] ].compact_blank.join(", ")
        lines = [
          "PHONE BOOKING — needs manual entry (no email given).",
          ("Service ID: #{br[:service_id]}" if br[:service_id].present?),
          ("Requested: #{br[:requested_start]}" if br[:requested_start].present?),
          ("Client type: #{br[:client_type]}" if br[:client_type].present?),
          ("Party size: #{br[:party_size]}" if br[:party_size].to_i > 1),
          ("Address: #{addr}" if addr.present?),
          (("Apartment — buzz #{ad[:buzz_code]}") if ActiveModel::Type::Boolean.new.cast(ad[:is_apartment])),
          ("Customer notes: #{br[:notes]}" if br[:notes].present?)
        ].compact
        lines.join("\n")
      end

      # Best-effort admin notify: in-app Notification to every admin AND an email
      # to the team inbox. A failure here never breaks the customer's request.
      def notify_admin_follow_up(callback_request)
        title = "Phone booking follow-up — #{callback_request.contact_name.presence || callback_request.contact_phone}"
        body  = "A customer booked by phone (no email) and needs a callback to confirm + manual booking.\n#{callback_request.notes}"
        User.where(role: :admin).find_each do |admin|
          Notification.create!(user: admin, kind: "booking_follow_up", title: title, body: body)
        end
        AdminMailer.booking_follow_up(callback_request).deliver_later
      rescue StandardError => e
        Rails.logger.warn("[BookingRequests] follow-up admin notify failed: #{e.message}")
      end

      # Location captured at booking, incl. apartment unit (line2) + buzz code.
      def build_address!(user)
        ap = params.require(:address).permit(
          :label, :line1, :line2, :city, :province, :postal_code,
          :latitude, :longitude, :is_apartment, :buzz_code
        )
        user.addresses.create!(ap.merge(default: user.addresses.none?))
      end

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
      # extra_amount folds add-on service prices into the one combined charge so
      # the customer pays once for the whole visit.
      def collect_initial_payment(booking, extra_amount: 0)
        amount =
          if booking.client_type_group? then (group_charge_full? ? booking.total : booking.required_deposit)
          elsif booking.timing_pay_upfront? then booking.total
          else 0
          end
        amount = amount.to_d + extra_amount.to_d if amount.to_d.positive? # only add when actually charging now
        return { mode: "none" } if amount.to_d <= 0

        tip = (params.dig(:booking_request, :tip) || params[:tip]).to_d
        gift_card_code = params.dig(:booking_request, :gift_card_code) || params[:gift_card_code]
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
        User.where(role: :admin).find_each do |admin|
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
