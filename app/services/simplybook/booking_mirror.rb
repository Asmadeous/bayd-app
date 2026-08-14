module SimplyBook
  # Mirrors a SimplyBook booking into our local DB.
  #
  # Policy: the web app is the single booking path. When SIMPLYBOOK_WEB_ONLY is
  # on (default), a booking that did NOT originate from us (i.e. made in the
  # SimplyBook client app) is cancelled in SimplyBook and the customer is asked
  # to book on the website. Our own bookings are always recognised — by
  # simplybook_id, or by a pending local booking awaiting its id — and never
  # cancelled.
  #
  # Requires Service#simplybook_event_id and EmployeeProfile#simplybook_unit_id
  # to be mapped; unmapped/incomplete records are skipped (left for reconcile).
  class BookingMirror
    TZ = ActiveSupport::TimeZone[ENV.fetch("BOOKING_TIMEZONE", "America/Toronto")]
    PENDING_MATCH_WINDOW = 2.minutes

    def self.upsert(detail)
      new(detail).upsert
    end

    def self.cancel(simplybook_id)
      booking = Booking.find_by(simplybook_id: simplybook_id.to_s)
      booking&.update_columns(status: "cancelled", synced_at: Time.current)
      booking
    end

    def initialize(detail)
      @d = detail.is_a?(Hash) ? detail : {}
    end

    def upsert
      return if remote_id.blank?

      existing = Booking.find_by(simplybook_id: remote_id) || link_pending
      return refresh(existing) if existing

      # No local record — this booking originated in SimplyBook (the app).
      return reject_app_origin if web_only?

      create_mirrored
    end

    private

    # ── Branches ──────────────────────────────────────────────────────────────

    # Our booking whose outbound push hasn't recorded the id yet (webhook beat us).
    def link_pending
      return unless existing_user && starts

      pending = Booking.where(simplybook_id: nil, user_id: existing_user.id)
                       .where(starts_at: (starts - PENDING_MATCH_WINDOW)..(starts + PENDING_MATCH_WINDOW))
                       .order(created_at: :desc).first
      pending&.update_columns(simplybook_id: remote_id, synced_at: Time.current)
      pending
    end

    def refresh(booking)
      attrs = { synced_at: Time.current, raw: @d }
      attrs[:status] = mapped_status if @d.key?("status")
      if starts
        attrs[:starts_at] = starts
        attrs[:ends_at]   = starts + booking.service.duration_minutes.minutes
      end
      booking.update!(attrs)
      booking
    end

    def create_mirrored
      return unless service && employee && user && starts

      Booking.create!(
        simplybook_id: remote_id,
        user: user, service: service, employee_profile: employee,
        starts_at: starts, ends_at: starts + service.duration_minutes.minutes,
        status: mapped_status,
        subtotal: service.price, travel_fee: 0, total: service.price,
        synced_at: Time.current, raw: @d
      )
    end

    def reject_app_origin
      SimplyBook::Client.new.cancel_booking(remote_id)
      notify_redirect
      nil
    rescue StandardError => e
      Rails.logger.warn("[SimplyBook::BookingMirror] could not cancel app-origin booking #{remote_id}: #{e.message}")
      nil
    end

    def notify_redirect
      return unless existing_user

      NotificationService.deliver(
        user: existing_user,
        kind: :booking_redirected,
        title: "Please book through our website",
        body: "New bookings are made on our website so we can match you with the right technician in your area. " \
              "Your booking-app request wasn't scheduled — please rebook with us.",
        action_url: "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/dashboard/customer/book"
      )
    end

    # ── Mapping helpers ────────────────────────────────────────────────────────

    def web_only?
      # Default OFF: the SimplyBook mobile app is a real booking channel, so
      # app-origin bookings are accepted + mirrored (not cancelled).
      ActiveModel::Type::Boolean.new.cast(ENV.fetch("SIMPLYBOOK_WEB_ONLY", "false"))
    end

    def remote_id
      @remote_id ||= (@d["id"] || @d["booking_id"]).to_s
    end

    def email
      @email ||= (@d.dig("client", "email") || @d["client_email"]).to_s.downcase.strip
    end

    def existing_user
      return @existing_user if defined?(@existing_user)
      @existing_user = email.present? ? User.find_by(email: email) : nil
    end

    def user
      @user ||= return_or_create_user
    end

    def return_or_create_user
      return if email.blank?

      user = existing_user || User.create!(email: email) do |u|
        first, last = client_name.split(" ", 2)
        u.first_name = first
        u.last_name  = last
        u.phone      = @d.dig("client", "phone") || @d["client_phone"]
        u.role       = :customer
        u.password   = SecureRandom.hex(16)
      end

      # This booking came FROM SimplyBook, so the user already IS a SimplyBook
      # client. Record their SimplyBook client id (if we don't have it yet) so we
      # never try to re-register them via the outbound onboarding path.
      cid = @d.dig("client", "id") || @d["client_id"]
      user.update_columns(simplybook_client_id: cid.to_s) if cid.present? && user.simplybook_client_id.blank?
      user
    end

    def service
      return @service if defined?(@service)
      eid = @d["event_id"] || @d["service_id"]
      @service = eid && Service.find_by(simplybook_event_id: eid.to_s)
    end

    def employee
      return @employee if defined?(@employee)
      uid = @d["unit_id"] || @d["provider_id"]
      @employee = uid && EmployeeProfile.find_by(simplybook_unit_id: uid.to_s)
    end

    def client_name
      (@d.dig("client", "name") || @d["client_name"]).to_s
    end

    def starts
      return @starts if defined?(@starts)
      @starts =
        if @d["start_datetime"].present?
          TZ.parse(@d["start_datetime"].to_s)
        elsif @d["start_date"].present? && @d["start_time"].present?
          TZ.parse("#{@d['start_date']} #{@d['start_time']}")
        end
    rescue ArgumentError
      @starts = nil
    end

    def mapped_status
      case @d["status"].to_s.downcase
      when "completed", "done"     then "completed"
      when "cancelled", "canceled" then "cancelled"
      when "no_show", "noshow"     then "no_show"
      when "in_progress"           then "in_progress"
      else "confirmed"
      end
    end
  end
end
