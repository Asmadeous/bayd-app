class AssignmentService
  STALENESS_THRESHOLD   = 5.minutes
  # Company timezone + open hours (single source of truth in BusinessHours).
  TZ                    = BusinessHours.zone
  OPEN_HOUR             = BusinessHours::OPEN_HOUR   # 9:00 AM local
  CLOSE_HOUR            = BusinessHours::CLOSE_HOUR  # 7:00 PM local
  AVG_SPEED_KMH         = 35
  MIN_TURNAROUND_MIN    = 15
  # Pre-booking priority: an on-demand job must leave this much extra margin
  # before a tech's next booked appointment, and techs with an appointment
  # within the protect window are de-prioritised for on-demand work.
  ON_DEMAND_NEXT_BUFFER_MIN = 20
  ON_DEMAND_PROTECT_WINDOW  = 3.hours

  Result = Struct.new(:success, :booking_request, :error, :addons, keyword_init: true) do
    def success? = success
  end

  def initialize(booking_request, addon_service_ids: nil)
    @booking_request   = booking_request
    @addon_service_ids = addon_service_ids
  end

  def call
    # 1. Address inside an admin-defined bookable area?
    return failure(:no_coverage, :no_coverage, "out_of_service_area") unless within_service_area?

    # 2. Inside operating hours AND able to finish before close?
    return failure(:failed, :outside_hours, "outside_operating_hours") unless within_operating_hours?

    # 3. Eligible techs: on-shift, do this service, within their radius, free, and
    #    reachable in time (travel from their previous job factored in).
    ranked = ranked_eligible
    if ranked.empty?
      status = customer_has_any_coverage? ? :no_availability : :no_coverage
      return failure(status, status, status.to_s)
    end

    # 4. Assign the nearest; if a concurrent booking grabbed the slot (the DB
    #    double-booking constraint trips), fall back to the next-nearest. When
    #    EVERY candidate's slot was taken, that's a clean "slot unavailable" —
    #    the tech(s) are genuinely booked at that time — not a server error.
    booking = assign(ranked)
    return failure(:no_availability, :slot_taken, "all_candidates_taken") if booking == :slot_taken
    return failure(:no_availability, :no_availability, "no_candidates") if booking.nil?

    # Resolve any add-ons (note-only — not their own booking; the tech factors the
    # extra work in on the day). Stamps raw["addons"] on the booking too.
    @addon_result = AddonBooker.new(booking, @addon_service_ids).call

    # Confirmation now + timed reminders (day-before / day-of / dispatch) on Solid
    # Queue. Best-effort — a scheduling hiccup must not fail the booking.
    schedule_reminders(booking)

    Result.new(success: true, booking_request: @booking_request, addons: @addon_result)
  rescue StandardError => e
    @booking_request.update!(status: :failed)
    log_attempt(candidates: [], chosen: nil, reason: "error: #{e.message}")
    Result.new(success: false, booking_request: @booking_request, error: :failed)
  end

  private

  # ── Time helpers ──────────────────────────────────────────────────────────
  def requested_start
    @requested_start ||= @booking_request.requested_start || Time.current
  end

  def requested_end
    @requested_end ||= requested_start + total_duration_minutes.minutes
  end

  # Group bookings run longer: service duration × party size (1× for everyone else).
  def total_duration_minutes
    @total_duration_minutes ||= @booking_request.service.duration_minutes * booking_party_size
  end

  # Scheduled times are stored as naive wall-clock (the ET time the customer
  # picked); on-demand uses the current ET time. We compare wall-clock minutes
  # so the appointment both starts at/after open and *finishes* at/before close.
  def within_operating_hours?
    # requested_start is stored in UTC; business hours (OPEN/CLOSE_HOUR) are in
    # the company timezone — so compare against the LOCAL (Toronto) wall clock.
    ls = (@booking_request.requested_start || Time.current).in_time_zone(TZ)
    le = ls + total_duration_minutes.minutes
    (ls.hour * 60 + ls.min) >= OPEN_HOUR * 60 &&
      (le.hour * 60 + le.min) <= CLOSE_HOUR * 60 &&
      le.to_date == ls.to_date
  end

  # ── Candidate selection ───────────────────────────────────────────────────
  def base_pool
    pool = EmployeeProfile
           .active
           .on_shift
           .dispatchable
           .joins(:employee_services).where(employee_services: { service_id: @booking_request.service_id })
           .distinct
    # Honour a specific technician the customer picked in the booking UI.
    pool = pool.where(id: @booking_request.requested_employee_id) if @booking_request.requested_employee_id.present?
    pool
  end

  # Eligible techs as ranked {employee, distance_km, source}.
  # Scheduled (pre-booking): nearest first.
  # On-demand: prefer techs with no imminent pre-booking, then nearest — so
  # committed techs stay free for their pre-booked appointments.
  def ranked_eligible
    eligible = base_pool.filter_map do |ep|
      source, lat, lng = resolve_position(ep)
      distance = haversine_km(customer_lat, customer_lng, lat, lng)
      candidate = { employee: ep, distance_km: distance.round(3), source: source }
      candidate if eligible?(candidate)
    end

    if on_demand?
      eligible.sort_by { |c| [ committed_soon?(c[:employee]) ? 1 : 0, c[:distance_km] ] }
    else
      eligible.sort_by { |c| c[:distance_km] }
    end
  end

  def on_demand?
    @booking_request.on_demand?
  end

  # Does the tech have a booked appointment soon after this on-demand job?
  def committed_soon?(employee)
    employee.bookings
            .where(status: %w[confirmed in_progress])
            .where(starts_at: requested_end..(requested_end + ON_DEMAND_PROTECT_WINDOW))
            .exists?
  end

  def eligible?(candidate)
    ep = candidate[:employee]
    serves_customer_postal?(ep) &&
      ep.available_at?(requested_start, requested_end) &&
      travel_feasible?(ep)
  end

  # FSA restriction: the provider must list the customer's FSA. Strict once any
  # provider has configured coverage — an unknown FSA makes no tech eligible (no
  # distance fallback). Unrestricted only when no provider has FSAs set yet.
  def serves_customer_postal?(employee)
    return true unless EmployeeProfile.coverage_configured?
    return false if customer_fsa.blank?

    employee.serves_fsa?(customer_fsa)
  end

  # Can the tech physically get here from their previous job, and on to the next?
  # Delegates to the shared TravelFeasibility service (same logic the availability
  # slot filter uses, so offered slots always pass this gate).
  def travel_feasible?(employee)
    TravelFeasibility.new(
      employee:        employee,
      customer_lat:    customer_lat,
      customer_lng:    customer_lng,
      # On-demand must not eat into the margin a pre-booked appointment needs.
      next_buffer_min: (on_demand? ? ON_DEMAND_NEXT_BUFFER_MIN : 0)
    ).feasible?(requested_start, requested_end)
  end

  def travel_minutes(distance_km)
    return MIN_TURNAROUND_MIN if distance_km.nil? || !distance_km.finite?
    [ (distance_km / AVG_SPEED_KMH * 60).ceil, MIN_TURNAROUND_MIN ].max
  end

  def customer_has_any_coverage?
    @booking_request.service.employee_profiles.active.exists?
  end

  # ── Assignment (with race fallback) ───────────────────────────────────────
  # Returns the created Booking, or :slot_taken when every candidate's slot was
  # grabbed by a concurrent booking (the no_double_booking guard tripped for all
  # of them), or nil when there were simply no candidates to try.
  def assign(ranked)
    tripped = false
    ranked.each do |candidate|
      return create_booking_for(candidate, ranked)
    rescue ActiveRecord::StatementInvalid => e
      raise unless e.cause.is_a?(PG::ExclusionViolation) # double-booking guard tripped
      tripped = true
      next # slot taken concurrently — try the next-nearest tech
    end
    tripped ? :slot_taken : nil
  end

  # Group bookings bill per person: clamp to 2..GROUP_SIZE. Everyone else is 1.
  def booking_party_size
    return 1 unless @booking_request.client_type_group?

    [ [ @booking_request.party_size.to_i, 2 ].max, Service::GROUP_SIZE ].min
  end

  def create_booking_for(candidate, ranked)
    booking = nil
    ActiveRecord::Base.transaction do
      distance = candidate[:distance_km]
      @booking_request.update!(
        status:               :assigned,
        assigned_employee:    candidate[:employee],
        # nil when coordinates are unknown (haversine → Infinity) so we don't
        # overflow the numeric column.
        assigned_distance_km: distance&.finite? ? distance : nil,
        location_source:      candidate[:source]
      )

      qty   = booking_party_size
      price = @booking_request.service.price_for(@booking_request.client_type) * qty
      booking = Booking.create!(
        user:             @booking_request.user,
        employee_profile: candidate[:employee],
        partner_id:       candidate[:employee].partner_id,
        service:          @booking_request.service,
        booking_request:  @booking_request,
        address:          @booking_request.address,
        client_type:      @booking_request.client_type,
        party_size:       qty,
        # Group bookings require payment — held as pending until the deposit/full
        # lands (confirmed by the payment webhook). Others confirm immediately.
        status:           (@booking_request.client_type_group? ? "pending" : "confirmed"),
        starts_at:        requested_start,
        ends_at:          requested_end,
        subtotal:         price,
        travel_fee:       0,
        total:            price,
        service_latitude:  customer_lat,
        service_longitude: customer_lng
      )

      @booking_request.update!(status: :booked)
      log_attempt(candidates: ranked, chosen: candidate[:employee], reason: "nearest_eligible")
    end
    booking
  end

  # Booking reminders (confirmation + timed) via Solid Queue. Best-effort so a
  # scheduling failure never breaks a completed booking.
  def schedule_reminders(booking)
    BookingReminders.schedule(booking)
  rescue StandardError => e
    Rails.logger.warn("[AssignmentService] reminder scheduling failed for booking #{booking&.id}: #{e.message}")
  end

  # ── Geo helpers ───────────────────────────────────────────────────────────
  def within_service_area?
    EmployeeProfile.covers?(@booking_request.address&.postal_code)
  end

  # FSA of the customer's address. Coverage matches on the FSA (first 3 chars);
  # live GPS is never used for it (that's for staff tracking). nil (no/invalid
  # postal on the address) means "unknown" and the gates reject.
  def customer_fsa
    return @customer_fsa if defined?(@customer_fsa)
    @customer_fsa = PostalCode.fsa(@booking_request.address&.postal_code)
  end

  def customer_lat
    @booking_request.customer_latitude || @booking_request.address&.latitude
  end

  def customer_lng
    @booking_request.customer_longitude || @booking_request.address&.longitude
  end

  def resolve_position(employee)
    if @booking_request.on_demand?
      loc = employee.employee_current_location
      if loc && employee.live_location_fresh?(staleness_threshold: STALENESS_THRESHOLD)
        return [ "live", loc.latitude, loc.longitude ]
      end
    end
    [ "base", employee.base_latitude, employee.base_longitude ]
  end

  # Haversine formula — returns km
  def haversine_km(lat1, lng1, lat2, lng2)
    Geo.haversine_km(lat1, lng1, lat2, lng2)
  end

  def failure(request_status, error_code, reason)
    # Record the outcome on the request, but never let a bookkeeping write turn a
    # handled failure into a 500. If the surrounding transaction is already
    # aborted (e.g. a no_double_booking violation just fired), update_column on a
    # fresh connection state still records the status; if even that can't run we
    # fall back to setting the attribute in memory so the caller still gets a
    # clean Result instead of an exception.
    begin
      @booking_request.update!(status: request_status)
    rescue ActiveRecord::StatementInvalid
      @booking_request.status = request_status
    end
    log_attempt(candidates: [], chosen: nil, reason: reason)
    Result.new(success: false, booking_request: @booking_request, error: error_code)
  rescue ActiveRecord::StatementInvalid
    # log_attempt (AssignmentAttempt.create!) can also hit an aborted transaction;
    # swallow it — the failure Result is what matters to the caller.
    Result.new(success: false, booking_request: @booking_request, error: error_code)
  end

  def log_attempt(candidates:, chosen:, reason:)
    AssignmentAttempt.create!(
      booking_request:  @booking_request,
      chosen_employee:  chosen,
      reason:           reason,
      candidates:       candidates.map { |c| c.slice(:distance_km, :source).merge(employee_id: c[:employee]&.id) }
    )
  end
end
