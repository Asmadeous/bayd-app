# Single source of truth for the company's booking timezone and open hours.
# Customers/staff pick wall-clock times in this zone; the app stores UTC. Every
# place that converts between the two (booking create, staff booking, operating-
# hours gate, availability slot filter) must use THIS zone so they never disagree.
module BusinessHours
  module_function

  # The booking timezone, from ENV (BOOKING_TIMEZONE in deploy config), defaulting
  # to Toronto. Returns an ActiveSupport::TimeZone.
  def zone
    @zone ||= ActiveSupport::TimeZone[ENV.fetch("BOOKING_TIMEZONE", "America/Toronto")] ||
              ActiveSupport::TimeZone["America/Toronto"]
  end

  OPEN_HOUR  = 9   # 9:00 AM local
  CLOSE_HOUR = 19  # 7:00 PM local

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
