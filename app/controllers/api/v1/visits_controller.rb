module Api
  module V1
    # Multi-service visits: the customer picks services and a time, VisitBooker
    # books one booking per service with the techs VisitPlanner chose, and the
    # money is collected once for the whole visit (VisitPaymentService).
    class VisitsController < ApplicationController
      include BookingIntake

      # Guest-friendly like booking requests: email-keyed, no login needed.
      skip_before_action :authenticate_user!, only: :create

      ERROR_MESSAGES = {
        no_coverage:     "Sorry, that address is outside our service area.",
        outside_hours:   "Please choose a time within our opening hours that lets every service finish before close.",
        no_availability: "We couldn't find technicians for every service at that time. Please try another slot.",
        slot_taken:      "That time was just booked. Please choose another slot.",
        invalid:         "Please choose your services, a time and an address."
      }.freeze

      def index
        scope = current_user.visits.includes(:address, bookings: [ :service, :payments, :review, { employee_profile: :user } ])
        scope = params[:when] == "upcoming" ? scope.where(ends_at: Time.current..).order(:starts_at) : scope.order(starts_at: :desc)
        records, meta = paginate(scope)
        render json: { data: VisitSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: VisitSerializer.render_as_hash(scoped_visit)
      end

      def create
        return create_follow_up_request if guest_without_email?

        booker   = current_user || find_or_create_customer(params.require(:customer))
        services = Service.active_in_order(intake_service_ids)
        services = nil if services && services.size > VisitPlanner::MAX_SERVICES

        result = VisitBooker.new(
          user: booker, services: services, address: visit_address(booker),
          starts_at: BusinessHours.parse_local(visit_params[:starts_at]),
          client_type: visit_params[:client_type], party_size: visit_params[:party_size],
          payment_timing: visit_params[:payment_timing], notes: visit_params[:notes],
          booked_for_name: visit_params[:booked_for_name], booked_for_phone: visit_params[:booked_for_phone]
        ).call

        unless result.success?
          return render json: { code: result.error, error: ERROR_MESSAGES.fetch(result.error, ERROR_MESSAGES[:invalid]) },
                        status: :unprocessable_entity
        end

        visit = result.visit
        subscription = maybe_start_subscription(visit)
        payment = collect_initial_payment(visit)
        render json: { visit: VisitSerializer.render_as_hash(visit.reload), payment: payment,
                       subscription_id: subscription&.id }, status: :created
      end

      # Pay the visit's balance (or a given amount) plus an optional tip in one go.
      def pay
        visit  = scoped_visit
        amount = params[:amount].present? ? params[:amount].to_d : visit.outstanding_balance
        result = VisitPaymentService.new(visit).collect(amount: amount, tip: params[:tip].to_d,
                                                        gift_card_code: params[:gift_card_code])
        if result.success?
          render json: { mode: result.mode.to_s, url: result.url, visit: VisitSerializer.render_as_hash(visit.reload) }
        else
          render json: { error: result.error }, status: :unprocessable_entity
        end
      end

      # Same rules as a single booking: not inside the cutoff, at most
      # MAX_CUSTOMER_RESCHEDULES times. Techs may change; the customer is told who.
      def reschedule
        visit     = scoped_visit
        new_start = BusinessHours.parse_local(params[:starts_at])
        return render(json: { error: "A valid new date and time is required." }, status: :unprocessable_entity) if new_start.nil?
        return cutoff_error("Reschedules") if inside_cutoff?(visit)
        if visit.live_lines.first&.reschedule_count.to_i >= BookingsController::MAX_CUSTOMER_RESCHEDULES
          return render json: { error: "You've reached the reschedule limit for this appointment. Please call us or cancel and rebook." },
                        status: :unprocessable_entity
        end

        visit.reschedule!(new_start: new_start, by_customer: true)
        render json: VisitSerializer.render_as_hash(visit.reload)
      rescue Booking::RescheduleError => e
        render json: { error: RESCHEDULE_ERRORS.fetch(e.reason, RESCHEDULE_ERRORS[:not_reschedulable]), code: e.reason },
               status: e.reason == :slot_taken ? :conflict : :unprocessable_entity
      end

      def cancel
        visit = scoped_visit
        if visit.live_lines.empty?
          return render json: { error: "This appointment can't be cancelled." }, status: :unprocessable_entity
        end
        return cutoff_error("Cancellations") if inside_cutoff?(visit)

        visit.cancel!(reason: params[:reason])
        render json: VisitSerializer.render_as_hash(visit.reload)
      end

      RESCHEDULE_ERRORS = {
        not_reschedulable: "This appointment can no longer be rescheduled.",
        outside_hours:     "Please choose a time within our opening hours that lets every service finish before close.",
        no_availability:   "We couldn't find technicians for every service at that time. Please pick another open time.",
        slot_taken:        "That time was just taken. Please pick another open time."
      }.freeze

      private

      def inside_cutoff?(visit)
        first = visit.live_lines.first
        first && first.starts_at <= BookingsController::CANCEL_CUTOFF_HOURS.hours.from_now
      end

      def cutoff_error(what)
        render json: { error: "#{what} must be at least #{BookingsController::CANCEL_CUTOFF_HOURS} hours before your appointment. Please call us for last-minute changes." },
               status: :unprocessable_entity
      end

      def scoped_visit = current_user.visits.find(params[:id])

      def visit_params
        params.require(:visit).permit(
          :starts_at, :address_id, :client_type, :party_size, :payment_timing,
          :booked_for_name, :booked_for_phone, :notes, :tip, :gift_card_code, :group_charge,
          :recurrence_active, :recurrence_interval_unit, :recurrence_interval_count, :auto_charge,
          service_ids: []
        )
      end

      def intake_params = params[:visit] || {}
      def intake_service_ids = Array(intake_params[:service_ids]).compact_blank

      # A saved address must belong to the booker; otherwise the inline one.
      def visit_address(booker)
        return booker.addresses.find(visit_params[:address_id]) if visit_params[:address_id].present?

        build_address!(booker) if params[:address].present?
      end

      # Money due now: a group's deposit (or the whole total when asked), the
      # total for pay-now, nothing for pay-after. A tip is collected whenever given.
      def collect_initial_payment(visit)
        amount =
          if visit.client_type_group? then (visit_params[:group_charge].to_s == "full" ? visit.total : visit.required_deposit)
          elsif visit.timing_pay_upfront? then visit.total
          else 0
          end
        record_deposit(visit) if visit.client_type_group?

        tip = visit_params[:tip].to_d
        return { mode: "none" } if amount.to_d <= 0 && tip <= 0

        result = VisitPaymentService.new(visit).collect(amount: amount, tip: tip, gift_card_code: visit_params[:gift_card_code])
        return { mode: "error", error: result.error } unless result.success?

        { mode: result.mode.to_s, url: result.url }.compact
      end

      # Repeat the visit on a schedule when the customer opted in.
      def maybe_start_subscription(visit)
        return unless ActiveModel::Type::Boolean.new.cast(visit_params[:recurrence_active])

        unit  = visit_params[:recurrence_interval_unit].to_s.presence_in(Subscription::UNITS) || "week"
        count = visit_params[:recurrence_interval_count].to_i
        return unless count.positive?

        Subscription.start_from_visit(visit, interval_unit: unit, interval_count: count,
                                             auto_charge: ActiveModel::Type::Boolean.new.cast(visit_params[:auto_charge]))
      end

      # Each line shows its share of the visit's deposit.
      def record_deposit(visit)
        lines = visit.bookings.to_a
        VisitPaymentService.split(visit.required_deposit, lines.map(&:total)).zip(lines).each do |share, booking|
          booking.update!(deposit_amount: share)
        end
      end
    end
  end
end
