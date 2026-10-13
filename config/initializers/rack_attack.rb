class Rack::Attack
  # Throttle counters live in the Rails cache — make sure production uses a real,
  # shared store (Solid Cache / Redis / memcached), not :null_store.
  Rack::Attack.cache.store = Rails.cache

  class Request < ::Rack::Request
    def api? = path.start_with?("/api/")

    # The signed-in user from the bearer token (same secret and algorithm as
    # ApplicationController), or nil when anonymous or the token is bad/expired.
    def user_id
      return @user_id if defined?(@user_id)

      token = get_header("HTTP_AUTHORIZATION").to_s[/\ABearer (.+)\z/, 1]
      secret = ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base
      @user_id = token && JWT.decode(token, secret, true, algorithm: "HS256").first["sub"]
    rescue JWT::DecodeError
      @user_id = nil
    end
  end

  ### Payment webhooks: signature-checked, from the providers' own servers ###
  safelist("webhooks") { |req| req.path.start_with?("/api/v1/webhooks/") }

  ### System-wide API limits ###
  # Signed-in users per account, so staff behind one office IP don't share an
  # allowance; the dashboards make several calls per page.
  throttle("api/user", limit: 300, period: 1.minute) do |req|
    req.user_id if req.api?
  end
  throttle("api/ip", limit: 120, period: 1.minute) do |req|
    req.ip if req.api? && req.user_id.nil?
  end
  # Hard ceiling for any one IP, signed in or not.
  throttle("api/ip/ceiling", limit: 1200, period: 1.minute) do |req|
    req.ip if req.api?
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
