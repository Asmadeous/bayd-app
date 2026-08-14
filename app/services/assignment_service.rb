class AssignmentService
  STALENESS_THRESHOLD   = 5.minutes
  TZ                    = ActiveSupport::TimeZone["America/Toronto"]
  OPEN_HOUR             = 10   # 10:00 AM ET
  CLOSE_HOUR            = 19   # 7:00 PM ET
  AVG_SPEED_KMH         = 35
  MIN_TURNAROUND_MIN    = 15
  # Pre-booking priority: an on-demand job must leave this much extra margin
  # before a tech's next booked appointment, and techs with an appointment
  # within the protect window are de-prioritised for on-demand work.
  ON_DEMAND_NEXT_BUFFER_MIN = 20
  ON_DEMAND_PROTECT_WINDOW  = 3.hours

  Result = Struct.new(:success, :booking_request, :error, keyword_init: true) do
    def success? = success
  end

  def initialize(booking_request)
    @booking_request = booking_request
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
    #    double-booking constraint trips), fall back to the next-nearest.
    booking = assign(ranked)
    return failure(:no_availability, :no_availability, "all_candidates_taken") unless booking

    register_simplybook_client(booking) # book-by-email → SimplyBook PWA account
    push_to_simplybook(booking)
    Result.new(success: true, booking_request: @booking_request)
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
    ls = @booking_request.requested_start || Time.current.in_time_zone(TZ)
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
  def travel_feasible?(employee)
    return true if customer_lat.nil? || customer_lng.nil?

    active = employee.bookings.where(status: %w[confirmed in_progress])

    prev_job = active.where("ends_at <= ?", requested_start).order(ends_at: :desc).first
    if prev_job
      d = haversine_km(prev_job.service_latitude, prev_job.service_longitude, customer_lat, customer_lng)
      return false if prev_job.ends_at + travel_minutes(d).minutes > requested_start
    end

    next_job = active.where("starts_at >= ?", requested_end).order(starts_at: :asc).first
    if next_job
      d = haversine_km(customer_lat, customer_lng, next_job.service_latitude, next_job.service_longitude)
      # On-demand must not eat into the margin a pre-booked appointment needs.
      buffer = on_demand? ? ON_DEMAND_NEXT_BUFFER_MIN : 0
      return false if requested_end + (travel_minutes(d) + buffer).minutes > next_job.starts_at
    end

    true
  end

  def travel_minutes(distance_km)
    return MIN_TURNAROUND_MIN if distance_km.nil? || !distance_km.finite?
    [ (distance_km / AVG_SPEED_KMH * 60).ceil, MIN_TURNAROUND_MIN ].max
  end

  def customer_has_any_coverage?
    @booking_request.service.employee_profiles.active.exists?
  end

  # ── Assignment (with race fallback) ───────────────────────────────────────
  def assign(ranked)
    ranked.each do |candidate|
      return create_booking_for(candidate, ranked)
    rescue ActiveRecord::StatementInvalid => e
      raise unless e.cause.is_a?(PG::ExclusionViolation) # double-booking guard tripped
      next # slot taken concurrently — try the next-nearest tech
    end
    nil
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

  # ── SimplyBook client onboarding (best-effort) ────────────────────────────
  # A booking customer's account lives in SimplyBook (they use the SimplyBook
  # client PWA, not our dashboard). On their first booking, register them as a
  # SimplyBook client and let SimplyBook email them a set-password link. We store
  # the returned client id on the user so we NEVER register the same person twice
  # — if it's already set, skip entirely. Unlike push_to_simplybook, this does
  # NOT need the service/provider mapping (it only registers the client), so it
  # runs even while booking-event sync is dormant.
  def register_simplybook_client(booking)
    user = booking&.user
    return unless user
    return if user.simplybook_client_id.present? # already registered — no double-create
    return if ENV["SIMPLYBOOK_COMPANY"].blank?   # SimplyBook not configured

    cid = SimplyBook::Client.new.register_client(
      name:  simplybook_client_payload[:name],
      email: user.email,
      phone: user.phone
    )
    user.update_columns(simplybook_client_id: cid) if cid.present?
  rescue StandardError => e
    Rails.logger.warn("[AssignmentService] SimplyBook client onboarding failed for booking #{booking&.id}: #{e.message}")
  end

  # ── SimplyBook outbound (best-effort) ─────────────────────────────────────
  def push_to_simplybook(booking)
    return unless booking
    # Skip while SimplyBook mapping is dormant — without a mapped service event id
    # and provider unit id the push can only 400. It resumes automatically once
    # the service/provider are mapped.
    return if booking.service.simplybook_event_id.blank? || booking.employee_profile.simplybook_unit_id.blank?

    simplybook_id = SimplyBook::Client.new.create_booking(
      service_id:  booking.service.simplybook_event_id,
      unit_id:     booking.employee_profile.simplybook_unit_id,
      starts_at:   booking.starts_at,
      ends_at:     booking.ends_at,
      client:      simplybook_client_payload,
      # Group bookings carry the party size so SimplyBook books that many slots.
      count:       (booking.party_size.to_i if booking.client_type_group?),
      # Record the client tier as a note (SimplyBook has one price per service,
      # so this is how the provider sees adult/kids/elderly/group).
      comment:     "Client type: #{booking.client_type}#{" (party of #{booking.party_size})" if booking.client_type_group?}"
    )
    booking.update_columns(simplybook_id: simplybook_id, synced_at: Time.current) if simplybook_id.present?
  rescue StandardError => e
    Rails.logger.warn("[AssignmentService] SimplyBook push failed for booking #{booking&.id}: #{e.message}")
  end

  def simplybook_client_payload
    user = @booking_request.user
    {
      name:  [ user.first_name, user.last_name ].compact.join(" ").strip.presence || user.email,
      email: user.email,
      phone: user.phone
    }
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
    @booking_request.update!(status: request_status)
    log_attempt(candidates: [], chosen: nil, reason: reason)
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
