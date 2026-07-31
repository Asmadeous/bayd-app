module SimplyBook
  # Thin wrapper over the SimplyBook.me **admin** REST API v2
  # (https://user-api-v2.simplybook.me, see swagger-admin.json).
  #
  # Auth: POST /admin/auth with { company, login, password } where `password`
  # is an **API User Key** (Settings → API User Keys). The key bypasses IP
  # verification and 2FA and is scoped per-application — we never send a human
  # password. The returned token + company go in X-Token / X-Company-Login on
  # every subsequent call.
  class Client
    API_URL     = "https://user-api-v2.simplybook.me".freeze
    COMPANY     = ENV.fetch("SIMPLYBOOK_COMPANY", "")
    LOGIN       = ENV.fetch("SIMPLYBOOK_LOGIN", "")
    API_USER_KEY = ENV.fetch("SIMPLYBOOK_API_USER_KEY", "")

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

    # `client` is an optional { name:, email:, phone: } hash. We resolve it to a
    # SimplyBook client_id (find by email, else create) so the booking is linked
    # to that client and visible in their SimplyBook client PWA.
    # Returns the new booking's id as a String, or nil.
    def create_booking(service_id:, unit_id:, starts_at:, client: nil)
      body = {
        service_id:     service_id,
        provider_id:    unit_id,
        start_datetime: starts_at.strftime("%Y-%m-%d %H:%M:%S")
      }
      if (cid = resolve_client_id(client))
        body[:client_id] = cid
      end

      resp = @conn.post("/admin/bookings", body)
      raise "SimplyBook error #{resp.status}: #{resp.body}" unless resp.success?

      # BookingResultEntity: { bookings: [ { id, ... } ], batch: ... }
      resp.body.dig("bookings", 0, "id")&.to_s
    end

    def cancel_booking(simplybook_id)
      resp = @conn.delete("/admin/bookings/#{simplybook_id}")
      raise "SimplyBook error #{resp.status}" unless resp.success?
      true
    end

    # AdminReportBookingEntity list. The endpoint filters by created/appointment
    # date via filter[date_from] / filter[date_to] (YYYY-MM-DD).
    def bookings(date_from:, date_to:)
      get("/admin/bookings", "filter[date_from]" => date_from.to_s, "filter[date_to]" => date_to.to_s)
    end

    # Single booking detail (AdminBookingDetailsEntity) — used to mirror a
    # webhook notification. Returns the booking hash, or nil if not found.
    def get_booking(simplybook_id)
      resp = @conn.get("/admin/bookings/#{simplybook_id}")
      return nil unless resp.success?
      resp.body.is_a?(Hash) ? resp.body : nil
    end

    private

    def fetch_token
      auth = Faraday.new(url: API_URL) { |f| f.request :json; f.response :json; f.adapter Faraday.default_adapter }
      resp = auth.post("/admin/auth", { company: COMPANY, login: LOGIN, password: API_USER_KEY })
      raise "SimplyBook auth failed: #{resp.status} #{resp.body}" unless resp.success?
      resp.body["token"]
    end

    # Find a SimplyBook client by email, or create one. Returns the id or nil.
    def resolve_client_id(client)
      return nil if client.blank?

      data  = client.compact
      email = data[:email].to_s.strip
      return create_client(data) if email.blank?

      resp = @conn.get("/admin/clients", "filter[search]" => email)
      match = Array(list_data(resp.body)).find { |c| c["email"].to_s.casecmp?(email) }
      match ? match["id"] : create_client(data)
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] client resolve failed: #{e.message}")
      nil
    end

    def create_client(data)
      resp = @conn.post("/admin/clients", { name: data[:name], email: data[:email], phone: data[:phone] }.compact)
      resp.success? ? resp.body["id"] : nil
    end

    # Admin list endpoints wrap rows as { data: [...], metadata: {...} } or a
    # bare array depending on the resource.
    def list_data(body)
      body.is_a?(Hash) ? (body["data"] || []) : body
    end

    def get(path, params = {})
      resp = @conn.get(path, params)
      raise "SimplyBook error #{resp.status}" unless resp.success?
      list_data(resp.body)
    end
  end
end
