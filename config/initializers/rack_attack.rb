class Rack::Attack
  # Throttle counters live in the Rails cache — make sure production uses a real,
  # shared store (Solid Cache / Redis / memcached), not :null_store.
  Rack::Attack.cache.store = Rails.cache

  ### Global API ceiling — per IP ###
  throttle("api/ip", limit: 60, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  ### Login / register — blunt brute force & credential stuffing ###
  throttle("auth/ip/min", limit: 5, period: 1.minute) do |req|
    req.ip if req.post? && req.path.start_with?("/api/v1/auth/")
  end
  throttle("auth/ip/hour", limit: 30, period: 1.hour) do |req|
    req.ip if req.post? && req.path.start_with?("/api/v1/auth/")
  end

  ### Public guest booking (no login) — keep it tight against spam ###
  throttle("booking/ip/10m", limit: 5, period: 10.minutes) do |req|
    req.ip if req.post? && req.path == "/api/v1/booking_requests"
  end
  throttle("booking/ip/day", limit: 20, period: 1.day) do |req|
    req.ip if req.post? && req.path == "/api/v1/booking_requests"
  end

  ### Other public form submissions ###
  PUBLIC_FORM_PATHS = %w[
    /api/v1/callback_requests
    /api/v1/contact
    /api/v1/franchise
    /api/v1/newsletter/subscribe
    /api/v1/reviews
  ].freeze
  throttle("forms/ip", limit: 5, period: 10.minutes) do |req|
    req.ip if req.post? && PUBLIC_FORM_PATHS.any? { |p| req.path.start_with?(p) }
  end

  self.throttled_responder = lambda do |_env|
    [ 429,
      { "Content-Type" => "application/json", "Retry-After" => "60" },
      [ { error: "Too many requests" }.to_json ] ]
  end
end
