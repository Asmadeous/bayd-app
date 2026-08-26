# Computes a technician's free booking slots for a given service + date, from OUR
# own data — replacing SimplyBook's available-slots call. A slot is offered only
# when the whole visit fits the tech's bookable hours that day, doesn't overlap an
# existing booking, and is reachable given travel between adjacent jobs.
#
#   free slots = the day's bookable window(s)
#              − existing bookings (their [starts_at, ends_at) windows)
#              − travel infeasible slots (TravelFeasibility, 15-min floor)
#
# Bookable window for a date:
#   - an AvailabilityOverride for that date WINS over the weekly template:
#       available=false            -> no availability (blackout)
#       available + start/end set  -> exactly that partial-day window
#       available + no times       -> fall back to the weekly template for the day
#   - otherwise the AvailabilitySchedule rows for that day_of_week (split shifts)
#
# Times in the schedule/override are time-of-day in BusinessHours.zone; we combine
# them with the date in that zone to get absolute instants that line up with the
# UTC-stored bookings. Returns slot start times as "HH:MM" strings (the shape the
# booking form already consumes), sorted and de-duplicated.
class AvailabilityEngine
  SLOT_STEP_MIN = 15

  # employee   — EmployeeProfile
  # service    — Service (its duration drives the visit length)
  # date       — Date to check
  # party_size — a group is ONE long visit; duration scales by this (default 1)
  # customer_lat/lng — appointment location for travel feasibility (nil = not judged)
  def initialize(employee:, service:, date:, party_size: 1, customer_lat: nil, customer_lng: nil)
    @employee   = employee
    @service    = service
    @date       = date
    @party_size = [ party_size.to_i, 1 ].max
    @customer_lat = customer_lat
    @customer_lng = customer_lng
  end

  # Array of "HH:MM" slot starts the tech is free for this visit.
  def slots
    windows = bookable_windows
    return [] if windows.empty?

    tf = TravelFeasibility.new(employee: @employee, customer_lat: @customer_lat, customer_lng: @customer_lng)
    duration = @service.duration_minutes * @party_size

    windows.flat_map { |ws, we| candidate_starts(ws, we, duration) }
           .select  { |start| fits_and_free?(start, duration, tf) }
           .map     { |start| start.in_time_zone(BusinessHours.zone).strftime("%H:%M") }
           .uniq
           .sort
  end

  # Earliest date from `from` (inclusive) within `horizon_days` that has any slot.
  # Bounds the search so an unlimited booking horizon can't scan forever.
  def self.first_available_date(employee:, service:, from:, horizon_days: 120, **opts)
    (0..horizon_days).each do |offset|
      date = from + offset
      engine = new(employee: employee, service: service, date: date, **opts)
      return date if engine.slots.any?
    end
    nil
  end

  private

  # [[window_start_instant, window_end_instant], ...] for the date. Delegates to
  # EmployeeProfile#bookable_windows_for so the engine and the booking gate
  # (available_at?) share ONE definition of a tech's bookable hours.
  def bookable_windows
    @employee.bookable_windows_for(@date)
  end

  # 15-min-granularity starts from window start up to the last start whose full
  # visit still finishes by the window end.
  def candidate_starts(window_start, window_end, duration)
    last_start = window_end - duration.minutes
    return [] if last_start < window_start

    starts = []
    cursor = window_start
    while cursor <= last_start
      starts << cursor
      cursor += SLOT_STEP_MIN.minutes
    end
    starts
  end

  def fits_and_free?(start, duration, travel_feasibility)
    finish = start + duration.minutes
    return false if overlaps_existing_booking?(start, finish)

    travel_feasibility.feasible?(start, finish)
  end

  # Does [start, finish) collide with any of the tech's active bookings?
  def overlaps_existing_booking?(start, finish)
    existing_windows.any? { |b_start, b_end| start < b_end && b_start < finish }
  end

  def existing_windows
    @existing_windows ||=
      @employee.bookings
               .where(status: %w[pending confirmed in_progress])
               .where("ends_at > ? AND starts_at < ?", day_start, day_end)
               .pluck(:starts_at, :ends_at)
  end

  def day_start = BusinessHours.zone.local(@date.year, @date.month, @date.day, 0, 0)
  def day_end   = day_start + 1.day
end
