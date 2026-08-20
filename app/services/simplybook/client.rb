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

    # "Ian Ndegwa (Kids)" / "Ian Ndegwa (Group of 4)" — tags the client tier onto
    # THIS booking's name only, so it shows on the SimplyBook calendar grid (which
    # only ever displays client name + service). Adult gets no tag, so a normal
    # booking's calendar entry stays clean. The structured "Client type" intake
    # field push is disabled (see create_booking) — it caused repeated slow (5s+)
    # requests that ended in a 404 on /admin/bookings.
    def self.tag_client_name(base_name, client_type:, party_size: nil)
      return base_name if client_type.to_s == "adult"

      tag = client_type.to_s == "group" ? "Group of #{party_size.to_i.clamp(2..)}" : client_type.to_s.capitalize
      "#{base_name} (#{tag})"
    end

    def initialize
      @token = fetch_token
      @conn  = Faraday.new(url: API_URL) do |f|
        f.request  :json
        f.response :json
        # GET/PUT/DELETE only — a POST (create_booking, create_client) must never
        # be auto-retried on a timeout: if the first attempt actually landed on
        # SimplyBook's side, retrying fires a second create for the same booking.
        f.request  :retry, max: 2, methods: %i[get put delete]
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
    # `tier` (adult/kids/elderly/group) is written to the "Client type" intake
    # field so it shows on the provider's SimplyBook booking — a comment alone
    # doesn't surface on the calendar. Sent only when that intake field exists.
    def create_booking(service_id:, unit_id:, starts_at:, ends_at:, client: nil, count: nil, comment: nil, tier: nil, batch_id: nil)
      create_booking_result(
        service_id: service_id, unit_id: unit_id, starts_at: starts_at, ends_at: ends_at,
        client: client, count: count, comment: comment, tier: tier, batch_id: batch_id
      )[:id]
    end

    # Same as create_booking but returns { id:, batch_id: } from the
    # BookingResultEntity. Used to group a party into ONE SimplyBook "multiple"
    # booking: the first call creates a batch (batch_id nil → SB returns one),
    # each subsequent call passes that batch_id to join the same batch.
    def create_booking_result(service_id:, unit_id:, starts_at:, ends_at:, client: nil, count: nil, comment: nil, tier: nil, batch_id: nil, is_sequential: nil)
      body = {
        service_id:     service_id,
        provider_id:    unit_id,
        # SimplyBook v2 requires both start and end as "YYYY-MM-DD HH:MM:SS" strings
        # in the company's local zone — convert from stored UTC (see helper).
        start_datetime: simplybook_datetime(starts_at),
        end_datetime:   simplybook_datetime(ends_at)
      }
      body[:count]         = count if count.to_i > 1
      body[:batch_id]      = batch_id if batch_id
      # is_sequential marks a batch as consecutive services in one visit (service
      # add-ons), vs a plain "multiple" batch — see AddonBooker.
      body[:is_sequential] = true if is_sequential
      if client.present? && (cid = resolve_client_id(**client.slice(:name, :email, :phone)))
        body[:client_id] = cid
      end
      # DISABLED: additional_fields (the "Client type" intake tag) has been tied to
      # repeated slow (5s+) requests that end in a SimplyBook 404 on /admin/bookings
      # (bookings #135, #136 — confirmed booked locally but never reached SimplyBook).
      # The comment fallback below still records the tier. Re-enable once the intake
      # field setup on SimplyBook's side is confirmed correct.
      # if tier.present? && (fid = additional_field_id(name: CLIENT_TYPE_FIELD))
      #   body[:additional_fields] = [ { id: fid, value: tier.to_s } ]
      # end

      resp = @conn.post("/admin/bookings", body)
      raise "SimplyBook error #{resp.status}: #{resp.body}" unless resp.success?

      # BookingResultEntity: { bookings: [ { id, ... } ], batch: { id, type, ... } }
      id = resp.body.dig("bookings", 0, "id")&.to_s
      set_booking_comment(id, comment) if id && comment.present?
      { id: id, batch_id: resp.body.dig("batch", "id") }
    end

    # PUT /admin/bookings/{id} — edit an existing booking (AdminBookingBuildEntity).
    # Used to reschedule to a new time without cancel+recreate. Returns true on
    # success. Requires service_id + provider_id + new start/end (per swagger).
    def update_booking(simplybook_id, service_id:, unit_id:, starts_at:, ends_at:)
      body = {
        service_id:     service_id,
        provider_id:    unit_id,
        start_datetime: simplybook_datetime(starts_at),
        end_datetime:   simplybook_datetime(ends_at)
      }
      resp = @conn.put("/admin/bookings/#{simplybook_id}", body)
      raise "SimplyBook error #{resp.status}: #{resp.body}" unless resp.success?
      true
    end

    # Resolve a SimplyBook intake/additional field id by its name (case-insensitive).
    # Requires the Intake Forms custom feature + the field created in SimplyBook.
    # Cached per instance; nil (best-effort) when the feature/field isn't set up.
    CLIENT_TYPE_FIELD = "Client type".freeze
    def additional_field_id(name:)
      @additional_field_ids ||= {}
      key = name.to_s.downcase
      return @additional_field_ids[key] if @additional_field_ids.key?(key)

      fields = Array(get("/admin/additional-fields"))
      match = fields.find do |f|
        [ f["name"], f["field_name"] ].compact.any? { |n| n.to_s.casecmp?(name.to_s) }
      end
      @additional_field_ids[key] = match&.dig("id")
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] additional_field_id lookup failed: #{e.message}")
      nil
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

    # ── Availability (admin API) — free bookable slots per provider/service ────
    # Powers the customer-facing "pick an open slot" calendar. SimplyBook computes
    # these from the provider's own working schedule minus existing bookings, so
    # the provider controls their calendar in SimplyBook (their words: "the
    # service provider controls their calendar").
    #
    # GET /admin/schedule/available-slots (per the REST v2 swagger) →
    #   TimeSlotEntity[] = [ { "id":, "date": "YYYY-MM-DD", "time": "HH:MM:SS" }, … ]
    # Required query params: service_id, provider_id, date, count. Returns the
    # bookable start times as "HH:MM" strings for that provider+service on the
    # date. Empty when the provider has no schedule configured or no free slots.
    # Best-effort: never raises.
    def available_slots(service_id:, provider_id:, date:, count: 1)
      resp = @conn.get("/admin/schedule/available-slots",
                       service_id:  service_id.to_s,
                       provider_id: provider_id.to_s,
                       date:        date.to_s,
                       count:       [ count.to_i, 1 ].max)
      return [] unless resp.success?

      rows = resp.body.is_a?(Array) ? resp.body : Array(list_data(resp.body))
      rows.filter_map { |s| normalize_slot_time(s) }.uniq.sort
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] available_slots failed: #{e.message}")
      []
    end

    # GET /admin/schedule/first-available-slot → the next open slot for this
    # provider+service starting from `date`; SimplyBook rolls forward to a LATER
    # date when the given day is fully booked. Returns "YYYY-MM-DD" (the date of
    # that next slot) or nil. Used to un-dead-end a fully-booked day.
    def first_available_date(service_id:, provider_id:, date:, count: 1)
      resp = @conn.get("/admin/schedule/first-available-slot",
                       service_id:  service_id.to_s,
                       provider_id: provider_id.to_s,
                       date:        date.to_s,
                       count:       [ count.to_i, 1 ].max)
      return nil unless resp.success?

      body = resp.body
      body = body.first if body.is_a?(Array)
      d = body.is_a?(Hash) ? body["date"] : nil
      d.to_s.match?(/\A\d{4}-\d{2}-\d{2}\z/) ? d.to_s : nil
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::Client] first_available_date failed: #{e.message}")
      nil
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
    # SimplyBook provider capacity = how many clients a provider can serve in one
    # slot. Group bookings need count>1 to return available slots, and SimplyBook
    # only offers count-N slots when qty >= N. So we set capacity to the group
    # max; otherwise a group booking finds zero availability. (This was the bug:
    # qty was hardcoded to 1, so count=2 always returned no slots.)
    GROUP_CAPACITY = Service::GROUP_SIZE # 5

    def create_provider(name:, email: nil, phone: nil, service_ids: nil)
      body = { name: name, qty: GROUP_CAPACITY, email: email, phone: phone, is_visible: true, services: service_ids }.compact
      resp = @conn.post("/admin/providers", body)
      raise "SimplyBook #{resp.status}: #{simplybook_error(resp)}" unless resp.success?
      resp.body["id"]&.to_s
    end

    # PUT /admin/providers/{id} (ProviderWritableEntity) — set the SimplyBook
    # service ids this provider can perform. This is what makes the provider
    # bookable for those services (and makes available-slots return times).
    # `name`/`qty` are re-sent because the writable entity replaces the record;
    # we read the current provider first to preserve them. Returns true on success.
    def update_provider_services(provider_id:, service_ids:)
      current = get_provider(provider_id) || {}
      body = {
        name: current["name"].presence || "Provider #{provider_id}",
        # Keep the provider's existing capacity, but never drop below the group
        # max — a qty of 1 would silently break group bookings on the next sync.
        qty:  [ current["qty"].to_i, GROUP_CAPACITY ].max,
        is_visible: current.fetch("is_visible", true),
        services: Array(service_ids)
      }
      resp = @conn.put("/admin/providers/#{provider_id}", body)
      raise "SimplyBook #{resp.status}: #{simplybook_error(resp)}" unless resp.success?
      true
    end

    # GET /admin/providers/{id} → the provider hash (ProviderEntity), or nil.
    def get_provider(provider_id)
      resp = @conn.get("/admin/providers/#{provider_id}")
      return nil unless resp.success?
      body = resp.body
      body = body.first if body.is_a?(Array)
      body.is_a?(Hash) ? body : nil
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

    # Admin token, CACHED. SimplyBook rate-limits /admin/auth attempts, so we must
    # NOT re-authenticate on every SimplyBook::Client.new — every call would hit
    # /admin/auth and quickly trip a 403 "Too many attempts". The token is valid
    # ~1h; we cache it 55m and reuse it across every request and every client
    # instance. Set SIMPLYBOOK_FORCE_REAUTH=1 to bypass the cache once if needed.
    TOKEN_CACHE_KEY = "simplybook:admin_token".freeze
    TOKEN_TTL = 55.minutes

    def fetch_token
      cached = Rails.cache.read(TOKEN_CACHE_KEY) if defined?(Rails) && ENV["SIMPLYBOOK_FORCE_REAUTH"].blank?
      return cached if cached.present?

      auth = Faraday.new(url: API_URL) { |f| f.request :json; f.response :json; f.adapter Faraday.default_adapter }
      resp = auth.post("/admin/auth", { company: COMPANY, login: LOGIN, password: API_USER_KEY })
      raise "SimplyBook auth failed: #{resp.status} #{resp.body}" unless resp.success?

      token = resp.body["token"]
      Rails.cache.write(TOKEN_CACHE_KEY, token, expires_in: TOKEN_TTL) if defined?(Rails) && token.present?
      token
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
          # Same rule as the admin conn: never auto-retry a POST (register_client).
          f.request  :retry, max: 2, methods: %i[get put delete]
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

    # A slot may come as a bare "HH:MM(:SS)" string or a hash keyed by time/
    # start_time/datetime. Normalize any of these to an "HH:MM" start time, or nil.
    def normalize_slot_time(slot)
      raw = if slot.is_a?(Hash)
        slot["time"] || slot["start_time"] || slot["start_datetime"] || slot["datetime"]
      else
        slot
      end
      m = raw.to_s.match(/(\d{1,2}):(\d{2})/)
      m && format("%02d:%s", m[1].to_i, m[2])
    end

    def get(path, params = {})
      resp = @conn.get(path, params)
      raise "SimplyBook error #{resp.status}" unless resp.success?
      list_data(resp.body)
    end

    # SimplyBook v2 wants "YYYY-MM-DD HH:MM:SS" wall-clock strings in the COMPANY's
    # local timezone (no offset marker). Our bookings are stored UTC (Rails default
    # zone is UTC), so we MUST convert to the booking zone before formatting —
    # otherwise a 3 PM Toronto booking is sent to SimplyBook as its UTC wall-clock
    # (7 PM), which SimplyBook reads as 7 PM local and rejects as "Selected time
    # not available". DST-safe via ActiveSupport::TimeZone.
    def simplybook_datetime(time)
      time.in_time_zone(BusinessHours.zone).strftime("%Y-%m-%d %H:%M:%S")
    end
  end
end
