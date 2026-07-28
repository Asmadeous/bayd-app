module SimplyBook
  class Client
    API_URL   = "https://user-api-v2.simplybook.me"
    AUTH_URL  = "https://user-api.simplybook.me/login"
    COMPANY   = ENV.fetch("SIMPLYBOOK_COMPANY", "")
    LOGIN     = ENV.fetch("SIMPLYBOOK_LOGIN", "")
    PASSWORD  = ENV.fetch("SIMPLYBOOK_PASSWORD", "")

    def initialize
      @token = fetch_token
      @conn  = Faraday.new(url: API_URL) do |f|
        f.request  :json
        f.response :json
        f.request  :retry, max: 2
        f.headers["X-Company-Login"] = COMPANY
        f.headers["X-Token"]         = @token
        f.adapter Faraday.default_adapter
      end
    end

    # `client` is an optional { name:, email:, phone: } hash. Passing it links
    # the booking to that client (matched by email) so they can see it after
    # logging into the SimplyBook client PWA with the same email.
    def create_booking(service_id:, unit_id:, starts_at:, client: nil)
      resp = @conn.post("/admin/bookings") do |req|
        body = {
          event_id:    service_id,
          unit_id:     unit_id,
          start_date:  starts_at.strftime("%Y-%m-%d"),
          start_time:  starts_at.strftime("%H:%M:%S")
        }
        body[:client] = client.compact if client.present?
        req.body = body
      end
      raise "SimplyBook error #{resp.status}: #{resp.body}" unless resp.success?
      resp.body.dig("data", "id")&.to_s
    end

    def cancel_booking(simplybook_id)
      resp = @conn.delete("/admin/bookings/#{simplybook_id}")
      raise "SimplyBook error #{resp.status}" unless resp.success?
      true
    end

    def bookings(date_from:, date_to:)
      get("/admin/bookings", date_from: date_from.to_s, date_to: date_to.to_s)
    end

    # Single booking detail (used to mirror a webhook notification back into our DB).
    # Returns the unwrapped booking hash, or nil if not found.
    def get_booking(simplybook_id)
      body = get("/admin/bookings/#{simplybook_id}")
      body.is_a?(Hash) ? (body["data"] || body) : nil
    end

    private

    def fetch_token
      auth = Faraday.new(url: AUTH_URL) { |f| f.request :json; f.response :json; f.adapter Faraday.default_adapter }
      resp = auth.post("", { company: COMPANY, login: LOGIN, password: PASSWORD })
      raise "SimplyBook auth failed: #{resp.status}" unless resp.success?
      resp.body["token"]
    end

    def get(path, params = {})
      resp = @conn.get(path, params)
      raise "SimplyBook error #{resp.status}" unless resp.success?
      resp.body
    end
  end
end
