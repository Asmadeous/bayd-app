class Rack::Attack
  # 60 requests/minute per IP for all API endpoints
  throttle("api/ip", limit: 60, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # Stricter limit on auth endpoints to slow brute force
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/auth/")
  end

  self.throttled_responder = lambda do |_env|
    [429, { "Content-Type" => "application/json" }, [{ error: "Too many requests" }.to_json]]
  end
end
