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
    # `count` is the group-booking party size (>1 books that many slots at the
    # service price — the SB service must have group booking enabled). `comment`
    # is a free-text note (we use it to record the client tier: adult/kids/
    # elderly/group), set via the comment endpoint after the booking is created.
    def create_booking(service_id:, unit_id:, starts_at:, ends_at:, client: nil, count: nil, comment: nil)
      body = {
        service_id:     service_id,
        provider_id:    unit_id,
        # SimplyBook v2 requires both start and end as "YYYY-MM-DD HH:MM:SS" strings.
        start_datetime: starts_at.strftime("%Y-%m-%d %H:%M:%S"),
        end_datetime:   ends_at.strftime("%Y-%m-%d %H:%M:%S")
      }
      body[:count] = count if count.to_i > 1
      if client.present? && (cid = resolve_client_id(**client.slice(:name, :email, :phone)))
        body[:client_id] = cid
      end

      resp = @conn.post("/admin/bookings", body)
      raise "SimplyBook error #{resp.status}: #{resp.body}" unless resp.success?

      # BookingResultEntity: { bookings: [ { id, ... } ], batch: ... }
      id = resp.body.dig("bookings", 0, "id")&.to_s
      set_booking_comment(id, comment) if id && comment.present?
      id
    end

    # PUT /admin/bookings/{id}/comment — attach a note (e.g. the client tier) so
    # the provider sees it in SimplyBook. Best-effort; never breaks the booking.
    def set_booking_comment(simplybook_id, comment)
      @conn.put("/admin/bookings/#{simplybook_id}/comment", { comment: comment.to_s })
      true
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] set comment failed for #{simplybook_id}: #{e.message}")
      false
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

    # ── Client PWA onboarding (public API) ────────────────────────────────────
    # A booking customer only needs a SimplyBook account — they log into the
    # SimplyBook client PWA, not our dashboard. So on booking we make sure the
    # client exists in SimplyBook (find-by-email, never duplicate) and trigger
    # SimplyBook's own "set your password" email. SimplyBook owns the credential
    # end-to-end; no password ever passes through us.
    #
    # Returns the SimplyBook client id (String) so the caller can store it on the
    # user and skip re-registering next time. Returns nil on failure (best-effort).
    def register_client(name:, email:, phone: nil)
      email = email.to_s.strip
      return nil if email.blank?

      cid = resolve_client_id(name: name, email: email, phone: phone)
      return nil if cid.blank?

      # Tell SimplyBook to email this client a set-password link so they can log
      # into the client PWA. Non-fatal: the client still exists even if it fails.
      remind_client_password(email)
      cid.to_s
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] register_client failed for #{email}: #{e.message}")
      nil
    end

    # POST /public/clients/remind-password — SimplyBook sends the client a
    # set/reset-password email (their PWA login). Uses the public API token.
    def remind_client_password(email)
      resp = public_conn.post("/public/clients/remind-password", { email: email.to_s.strip })
      resp.success?
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] remind-password failed for #{email}: #{e.message}")
      false
    end

    # ── Provider & service mirroring (admin API) ──────────────────────────────
    # Used by the one-time / repeatable mapping sync so bookings route to the
    # correct tech. Each returns the created record's id as a String, or nil.

    # POST /admin/providers (ProviderWritableEntity). `service_ids` are SimplyBook
    # service ids this provider can perform (nil = leave untouched, [] = clears).
    # Raises with the SimplyBook error body on failure so the caller can report it.
    def create_provider(name:, email: nil, phone: nil, service_ids: nil)
      # qty = provider capacity (how many simultaneous bookings). Required by
      # SimplyBook, must be 1..99; a mobile tech serves one client at a time → 1.
      body = { name: name, qty: 1, email: email, phone: phone, is_visible: true, services: service_ids }.compact
      resp = @conn.post("/admin/providers", body)
      raise "SimplyBook #{resp.status}: #{simplybook_error(resp)}" unless resp.success?
      resp.body["id"]&.to_s
    end

    # POST /admin/services (ServiceWriteableEntity). `provider_ids` are SimplyBook
    # provider ids that can perform it. Raises with the error body on failure.
    def create_service(name:, duration:, price: nil, provider_ids: nil)
      body = { name: name, duration: duration, price: price, is_visible: true, providers: provider_ids }.compact
      resp = @conn.post("/admin/services", body)
      raise "SimplyBook #{resp.status}: #{simplybook_error(resp)}" unless resp.success?
      resp.body["id"]&.to_s
    end

    # Pull the human-readable message + per-field errors out of a SimplyBook
    # error response ({ code, message, data: { field: [msgs] } }).
    def simplybook_error(resp)
      b = resp.body
      return resp.body.to_s.slice(0, 200) unless b.is_a?(Hash)
      parts = [ b["message"].presence ]
      Array(b["data"]).each { |field, msgs| parts << "#{field}: #{Array(msgs).join(', ')}" } if b["data"].is_a?(Hash)
      parts.compact.join(" | ").presence || "unknown error"
    end

    # Find an existing provider by name (case-insensitive) so we reuse SimplyBook's
    # pre-existing providers instead of duplicating them. Returns id String or nil.
    def find_provider_id(name:)
      Array(get("/admin/providers")).find { |p| p["name"].to_s.casecmp?(name.to_s) }&.dig("id")&.to_s
    end

    # Find an existing service by name (case-insensitive). Returns id String or nil.
    def find_service_id(name:)
      Array(get("/admin/services")).find { |s| s["name"].to_s.casecmp?(name.to_s) }&.dig("id")&.to_s
    end

    # ── Webhooks (admin API) — inbound sync from the SimplyBook app/PWA ────────
    # When a customer books/reschedules/cancels in the SimplyBook app, SimplyBook
    # POSTs to our registered webhook, which mirrors it into our system.

    def webhooks
      Array(get("/admin/webhooks"))
    end

    # POST /admin/webhooks { url, event }. Idempotent per (url, event): skips if
    # one already exists. Returns the webhook id String, or nil.
    def register_webhook(url:, event:)
      existing = webhooks.find { |w| w["url"].to_s == url && w["event"].to_s == event }
      return existing["id"]&.to_s if existing

      resp = @conn.post("/admin/webhooks", { url: url, event: event })
      raise "SimplyBook #{resp.status}: #{simplybook_error(resp)}" unless resp.success?
      resp.body["id"]&.to_s
    end

    private

    def fetch_token
      auth = Faraday.new(url: API_URL) { |f| f.request :json; f.response :json; f.adapter Faraday.default_adapter }
      resp = auth.post("/admin/auth", { company: COMPANY, login: LOGIN, password: API_USER_KEY })
      raise "SimplyBook auth failed: #{resp.status} #{resp.body}" unless resp.success?
      resp.body["token"]
    end

    # Faraday connection for the **public** API (/public/*). It authenticates via
    # POST /public/auth/token { company, key } (open endpoint) using the same
    # company-scoped API User Key, and sends the returned token in the headers.
    # Built lazily since most calls only touch the admin API.
    def public_conn
      @public_conn ||= begin
        auth = Faraday.new(url: API_URL) { |f| f.request :json; f.response :json; f.adapter Faraday.default_adapter }
        resp = auth.post("/public/auth/token", { company: COMPANY, key: API_USER_KEY })
        raise "SimplyBook public auth failed: #{resp.status} #{resp.body}" unless resp.success?
        token = resp.body["token"]
        Faraday.new(url: API_URL) do |f|
          f.request  :json
          f.response :json
          f.request  :retry, max: 2
          f.headers["X-Company-Login"] = COMPANY
          f.headers["X-Token"]         = token
          f.adapter Faraday.default_adapter
        end
      end
    end

    # Find a SimplyBook client by email, or create one. Returns the id or nil.
    # Accepts name:/email:/phone: keywords. Searching by email first is what
    # prevents duplicate client records for the same person.
    def resolve_client_id(name: nil, email: nil, phone: nil)
      email = email.to_s.strip
      data  = { name: name, email: email, phone: phone }.compact
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
