# Single source of truth for the booking timezone and open hours, which are the
# current franchise's. Customers/staff pick wall-clock times in this zone; the
# app stores UTC. Every place that converts between the two (booking create,
# staff booking, operating-hours gate, availability slot filter) must use THIS
# zone so they never disagree.
module BusinessHours
  module_function

  # The franchise's zone; with no franchise in context, BOOKING_TIMEZONE (deploy
  # config), defaulting to Toronto. Returns an ActiveSupport::TimeZone.
  def zone
    ActiveSupport::TimeZone[Current.franchise&.time_zone || ENV.fetch("BOOKING_TIMEZONE", "America/Toronto")] ||
      ActiveSupport::TimeZone["America/Toronto"]
  end

  DEFAULT_OPEN_HOUR  = 9   # 9:00 AM local
  DEFAULT_CLOSE_HOUR = 19  # 7:00 PM local

  def open_hour = Current.franchise&.open_hour || DEFAULT_OPEN_HOUR
  def close_hour = Current.franchise&.close_hour || DEFAULT_CLOSE_HOUR

  # Does [starts_at, ends_at) start at/after open and finish by close on one local
  # day? The same rule the booking gate applies, shared so offered == bookable.
  def open_for?(starts_at, ends_at)
    local_start = starts_at.in_time_zone(zone)
    local_end   = ends_at.in_time_zone(zone)
    local_end > local_start &&
      local_end.to_date == local_start.to_date &&
      (local_start.hour * 60) + local_start.min >= open_hour * 60 &&
      (local_end.hour * 60) + local_end.min <= close_hour * 60
  end

  # Interpret a naive wall-clock value ("2026-08-17T13:00:00", "2026-08-17 13:00",
  # or a Time the rack parser already stamped UTC) as local business time and
  # return the correct absolute instant. nil if it can't be parsed.
  def parse_local(value)
    return nil if value.blank?

    naive = value.is_a?(String) ? value : value.strftime("%Y-%m-%dT%H:%M:%S")
    zone.parse(naive)
  rescue ArgumentError, TypeError
    nil
  end
end
