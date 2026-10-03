# Plans a multi-service visit: for a date, which start times can staff EVERY
# chosen service, and who does what. Services run back-to-back in the order
# given. One tech who performs all of them takes the whole visit when they can
# (one trip, no hand-over); otherwise each service goes to the nearest eligible
# tech free for that service's slice of the visit.
#
# Eligibility matches AssignmentService: active, dispatchable, performs the
# service, covers the customer's FSA, inside their bookable hours, not booked,
# and able to travel there (TravelFeasibility). Candidate start times come from
# AvailabilityEngine so the time grid matches single-service booking.
class VisitPlanner
  Line = Struct.new(:service, :employee, :starts_at, :ends_at, keyword_init: true)

  BLOCKING_STATUSES = %w[pending confirmed in_progress].freeze
  # Most services one visit may combine (bounds the planning work per request).
  MAX_SERVICES = 6

  # services           - ordered Services (the visit's lines)
  # postal_code        - customer's postal code; blank = coverage not judged yet,
  #                      unless strict_coverage (booking time), which then fails
  # ignore_booking_ids - the visit's own current lines when re-planning it
  def initialize(services:, date:, customer_lat: nil, customer_lng: nil, postal_code: nil,
                 party_size: 1, strict_coverage: false, ignore_booking_ids: [])
    @services = Array(services)
    @date = date
    @customer_lat = customer_lat
    @customer_lng = customer_lng
    @postal_code = postal_code
    @party_size = [ party_size.to_i, 1 ].max
    @strict_coverage = strict_coverage
    @ignore_booking_ids = Array(ignore_booking_ids)
  end

  # { "HH:MM" => [Line, ...] } for every start on the date where the whole visit
  # can be staffed, in time order.
  def slots
    candidate_starts.each_with_object({}) do |start, out|
      plan = plan_at(start)
      out[label(start)] = plan if plan
    end
  end

  # The visit's lines if it starts at `start`, or nil when it can't be staffed.
  # exclude_employee_ids drops techs who just lost a race for this time.
  def plan_at(start, exclude_employee_ids: [])
    return if @services.empty? || start <= Time.current
    return unless BusinessHours.open_for?(start, start + total_minutes.minutes)

    excluded = exclude_employee_ids.map(&:to_i)
    single_tech_plan(start, excluded) || split_plan(start, excluded)
  end

  # The lines when each service keeps the tech given for it (a tech moving their
  # own visit), or nil when any of them can't make the new time.
  def plan_with(start, employees)
    return if @services.empty? || start <= Time.current
    return unless BusinessHours.open_for?(start, start + total_minutes.minutes)

    cursor = start
    @services.zip(employees).map do |service, employee|
      finish = cursor + duration(service).minutes
      return unless free?(employee, cursor, finish)

      line = Line.new(service: service, employee: employee, starts_at: cursor, ends_at: finish)
      cursor = finish
      line
    end
  end

  def single_tech?(plan) = plan.map { |l| l.employee.id }.uniq.one?

  # Earliest date from `from` (inclusive) with any plan, bounded like
  # AvailabilityEngine.first_available_date.
  def self.first_available_date(from:, horizon_days: 60, **opts)
    (0..horizon_days).each do |offset|
      date = from + offset
      return date if new(date: date, **opts).slots.any?
    end
    nil
  end

  private

  def total_minutes = @services.sum { |s| duration(s) }
  def duration(service) = service.duration_minutes * @party_size

  def single_tech_plan(start, excluded)
    finish = start + total_minutes.minutes
    tech = ranked(all_service_techs).reject { |ep| excluded.include?(ep.id) }
                                    .find { |ep| free?(ep, start, finish) }
    return unless tech

    cursor = start
    @services.map do |service|
      line = Line.new(service: service, employee: tech, starts_at: cursor, ends_at: cursor + duration(service).minutes)
      cursor = line.ends_at
      line
    end
  end

  def split_plan(start, excluded)
    cursor = start
    @services.map do |service|
      finish = cursor + duration(service).minutes
      tech = ranked(techs_for(service)).reject { |ep| excluded.include?(ep.id) }
                                       .find { |ep| free?(ep, cursor, finish) }
      return unless tech

      line = Line.new(service: service, employee: tech, starts_at: cursor, ends_at: finish)
      cursor = finish
      line
    end
  end

  # Starts offered by the engine for either the whole visit by one tech, or the
  # first service by any of its techs. Each is then fully planned in #slots.
  def candidate_starts
    labels = all_service_techs.flat_map do |ep|
      engine_slots(ep, @services.first, extra: total_minutes - duration(@services.first))
    end
    labels += techs_for(@services.first).flat_map { |ep| engine_slots(ep, @services.first, extra: 0) }
    labels.uniq.sort.map { |hhmm| BusinessHours.zone.parse("#{@date.iso8601} #{hhmm}") }
  end

  def engine_slots(employee, service, extra:)
    AvailabilityEngine.new(
      employee: employee, service: service, date: @date, party_size: @party_size,
      extra_minutes: extra, customer_lat: @customer_lat, customer_lng: @customer_lng,
      exclude_booking_ids: @ignore_booking_ids
    ).slots
  end

  def free?(employee, starts_at, ends_at)
    windows(employee).any? { |ws, we| starts_at >= ws && ends_at <= we } &&
      busy(employee).none? { |bs, be| starts_at < be && bs < ends_at } &&
      travel(employee).feasible?(starts_at, ends_at)
  end

  def windows(employee)
    (@windows ||= {})[employee.id] ||= employee.bookable_windows_for(@date)
  end

  def busy(employee)
    (@busy ||= {})[employee.id] ||= begin
      day_start = BusinessHours.zone.local(@date.year, @date.month, @date.day)
      employee.bookings.where(status: BLOCKING_STATUSES).where.not(id: @ignore_booking_ids)
              .where("ends_at > ? AND starts_at < ?", day_start, day_start + 1.day)
              .pluck(:starts_at, :ends_at)
    end
  end

  def travel(employee)
    (@travel ||= {})[employee.id] ||= TravelFeasibility.new(
      employee: employee, customer_lat: @customer_lat, customer_lng: @customer_lng,
      exclude_ids: @ignore_booking_ids
    )
  end

  def techs_for(service)
    (@techs_for ||= {})[service.id] ||=
      EmployeeProfile.active.dispatchable
                     .joins(:employee_services).where(employee_services: { service_id: service.id })
                     .distinct.to_a.select { |ep| covers?(ep) }
  end

  def all_service_techs
    @all_service_techs ||= @services.map { |s| techs_for(s) }.reduce { |a, b| a & b } || []
  end

  # With no postal code yet, coverage isn't judged (it fails closed only at
  # booking time), unless the tech works by radius and the location is known.
  def covers?(employee)
    return true unless coverage_configured?

    judged_by_radius = employee.service_radius_km.present? && @customer_lat && @customer_lng
    return !@strict_coverage if PostalCode.area(@postal_code).blank? && !judged_by_radius

    employee.serves_location?(postal_code: @postal_code, latitude: @customer_lat, longitude: @customer_lng)
  end

  def coverage_configured?
    return @coverage_configured if defined?(@coverage_configured)

    @coverage_configured = EmployeeProfile.coverage_configured?
  end

  # Nearest home base first; unknown positions last, then by id for stable picks.
  def ranked(employees)
    employees.sort_by { |ep| [ Geo.haversine_km(@customer_lat, @customer_lng, ep.base_latitude, ep.base_longitude), ep.id ] }
  end

  def label(start) = start.in_time_zone(BusinessHours.zone).strftime("%H:%M")
end
