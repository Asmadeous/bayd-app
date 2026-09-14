# Real road ETA between two points via the Google Directions API. Used for the
# day-of "tech is on the way" tracker so the customer sees a driving estimate,
# not a straight-line guess.
#
# Best-effort by design: if the key is missing, the call fails, or Google returns
# no route, we fall back to the straight-line estimate (Geo.haversine_km /
# average speed) so the ETA broadcast can NEVER break. Results are cached briefly
# (Solid Cache) because a moving tech pings often but road time between two points
# changes slowly.
module Directions
  BASE_URL       = "https://maps.googleapis.com".freeze
  AVG_SPEED_KMH  = TravelFeasibility::AVG_SPEED_KMH
  CACHE_TTL      = 60 # seconds — a ping cadence, not a routing cadence
  TIMEOUT        = 4

  module_function

  # Driving minutes from (from_lat,from_lng) to (to_lat,to_lng). Never raises;
  # returns an Integer, or nil only when even the fallback can't be computed.
  def eta_minutes(from_lat, from_lng, to_lat, to_lng)
    return nil if [ from_lat, from_lng, to_lat, to_lng ].any?(&:nil?)

    google_eta_minutes(from_lat, from_lng, to_lat, to_lng) ||
      straight_line_minutes(from_lat, from_lng, to_lat, to_lng)
  end

  # Straight-line fallback (matches the scheduler's travel model).
  def straight_line_minutes(from_lat, from_lng, to_lat, to_lng)
    km = Geo.haversine_km(from_lat.to_f, from_lng.to_f, to_lat.to_f, to_lng.to_f)
    return nil unless km&.finite?

    (km / AVG_SPEED_KMH * 60).ceil
  end

  # Real ROAD distance in km between two points, for fuel/mileage compensation.
  # Google's driving distance (roads, not straight-line) so a tech is paid for
  # what they actually drove. Falls back to haversine when routing is
  # unavailable, so a leg is never dropped to zero. Cached long (a fixed
  # clock-in -> job -> clock-out route doesn't change) keyed on both endpoints.
  def road_km(from_lat, from_lng, to_lat, to_lng)
    return nil if [ from_lat, from_lng, to_lat, to_lng ].any?(&:nil?)

    google_road_km(from_lat, from_lng, to_lat, to_lng) ||
      haversine_km(from_lat, from_lng, to_lat, to_lng)
  end

  def haversine_km(from_lat, from_lng, to_lat, to_lng)
    km = Geo.haversine_km(from_lat.to_f, from_lng.to_f, to_lat.to_f, to_lng.to_f)
    km&.finite? ? km : nil
  end

  def google_road_km(from_lat, from_lng, to_lat, to_lng)
    return nil unless api_key

    cache_key = "directions:km:#{from_lat},#{from_lng}->#{to_lat},#{to_lng}"
    Rails.cache.fetch(cache_key, expires_in: 1.day) do
      metres = fetch_google_distance_metres(from_lat, from_lng, to_lat, to_lng)
      metres && (metres.to_f / 1000)
    end
  rescue StandardError => e
    Rails.logger.warn("[Directions#road_km] #{e.class}: #{e.message}")
    nil
  end

  def fetch_google_distance_metres(from_lat, from_lng, to_lat, to_lng)
    body = directions_response(from_lat, from_lng, to_lat, to_lng)
    return nil unless body

    body.dig("routes", 0, "legs", 0, "distance", "value")
  end

  def google_eta_minutes(from_lat, from_lng, to_lat, to_lng)
    return nil unless api_key

    cache_key = "directions:eta:#{round5(from_lat)},#{round5(from_lng)}->#{to_lat},#{to_lng}"
    Rails.cache.fetch(cache_key, expires_in: CACHE_TTL) do
      fetch_google_eta(from_lat, from_lng, to_lat, to_lng)
    end
  rescue StandardError => e
    Rails.logger.warn("[Directions] #{e.class}: #{e.message}")
    nil
  end

  def fetch_google_eta(from_lat, from_lng, to_lat, to_lng)
    body = directions_response(from_lat, from_lng, to_lat, to_lng, traffic: true)
    return nil unless body

    leg = body.dig("routes", 0, "legs", 0)
    secs = leg&.dig("duration_in_traffic", "value") || leg&.dig("duration", "value")
    return nil unless secs

    (secs.to_f / 60).ceil
  end

  # One Google Directions request -> parsed OK body (or nil). Shared by ETA (which
  # wants live traffic) and mileage (which wants only road distance).
  def directions_response(from_lat, from_lng, to_lat, to_lng, traffic: false)
    resp = connection.get("/maps/api/directions/json") do |req|
      req.params[:origin]         = "#{from_lat},#{from_lng}"
      req.params[:destination]    = "#{to_lat},#{to_lng}"
      req.params[:mode]           = "driving"
      req.params[:departure_time] = "now" if traffic # enables duration_in_traffic
      req.params[:key]            = api_key
    end
    return nil unless resp.success?

    body = JSON.parse(resp.body)
    body["status"] == "OK" ? body : nil
  end

  # Round the (moving) origin to ~5 decimals so nearby pings share a cache entry.
  def round5(v) = v.to_f.round(5)

  def api_key = ENV["GOOGLE_MAPS_API_KEY"].presence

  def connection
    @connection ||= Faraday.new(url: BASE_URL) do |f|
      f.options.timeout      = TIMEOUT
      f.options.open_timeout = TIMEOUT
    end
  end
end
