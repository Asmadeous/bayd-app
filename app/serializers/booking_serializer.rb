class BookingSerializer < Blueprinter::Base
  identifier :id
  fields :status, :starts_at, :ends_at, :subtotal, :travel_fee, :total,
         :notes, :cancellation_reason, :created_at, :client_type, :party_size,
         :recurrence_active, :recurrence_interval_weeks, :auto_charge,
         :payment_timing, :payment_status, :deposit_amount,
         :booked_for_name, :booked_for_phone, :overtime_amount,
         :service_latitude, :service_longitude, :reschedule_count, :parent_booking_id,
         :visit_id, :visit_position

  # When messaging, live tracking, clock-in and navigation open for this booking
  # (Booking::ACCESS_LEAD_MIN before the start). The apps lock those actions
  # until then; the API enforces it regardless.
  field :access_opens_at do |booking|
    booking.access_opens_at
  end

  field :outstanding_balance do |booking|
    booking.outstanding_balance
  end

  # How the booking was paid (e.g. ["cash"], ["card", "interac"]) so staff and
  # admins can see the method a tech recorded.
  field :paid_methods do |booking|
    booking.payments.select { |p| p.status == "paid" }.filter_map(&:method).uniq
  end

  # Extra services the customer added to this visit. They are note-only (the same
  # tech does them back-to-back — NOT a separate booking), stored on raw["addons"]
  # as [{ id, name, price, duration }]. Empty when none.
  field :addons do |booking|
    booking.raw["addons"] || []
  end

  # The OTHER services on the same visit and who does them, so the customer card
  # shows every tech and a tech sees who they share the appointment with.
  # Empty for a standalone booking.
  field :visit_lines do |booking|
    next [] unless booking.visit

    booking.visit.bookings.reject { |b| b.id == booking.id }.map do |b|
      ep = b.employee_profile
      { id: b.id, service_id: b.service_id, service_name: b.service&.name, starts_at: b.starts_at, ends_at: b.ends_at,
        status: b.status, total: b.total, employee: { id: ep&.id, user_id: ep&.user_id, name: ep&.user&.first_name, photo_url: ep&.photo_image_url } }
    end
  end

  field :has_review do |booking|
    booking.review.present?
  end

  # When the tech is currently clocked in on this booking (open shift), the
  # clock-in time - the staff app runs a live service timer from it. nil otherwise.
  field :clocked_in_at do |booking|
    booking.shifts.detect { |s| s.status_open? }&.clock_in_at
  end

  # Whether to surface the work-scope video call (special-needs / first-timers).
  field :meeting_recommended do |booking|
    booking.meeting_recommended?
  end

  # Who the appointment is for - the staff app shows this on the job card and the
  # nav screen. Prefers an explicit booked-for name (group / manual bookings),
  # else the customer's own first name. First name only for privacy.
  field :customer_name do |booking|
    booking.booked_for_name.presence || booking.user&.first_name
  end

  association :service, blueprint: ServiceSerializer
  association :meeting, blueprint: MeetingSerializer
  association :address, blueprint: AddressSerializer

  # Default: the tech as the PUBLIC (customer-safe) profile - no contact, no
  # earnings. This is the safe default; a leak now requires opting IN to :full,
  # not remembering to opt out. `financials` (the tech's pay) is defined in the
  # :full view below, NOT here, so it isn't in the default customer payload.
  association :employee_profile, blueprint: EmployeeProfileSerializer, view: :public

  # ── Full view (STAFF / ADMIN) ──────────────────────────────────────────────
  # The tech's full profile (their own user record + operational data) and the
  # per-booking money picture. Rendered to the tech themselves and to admins only.
  view :full do
    association :employee_profile, blueprint: EmployeeProfileSerializer, view: :full

    # Who the tech calls to reach the client: the person it was booked for if
    # someone booked on their behalf, else the customer. Staff/admin views only.
    field :client_phone do |booking|
      booking.booked_for_phone.presence || booking.user&.phone.presence
    end

    # Per-booking money picture, per the tech's account type (partner vs direct).
    # NOT in the default view - a customer must never see their tech's earnings.
    field :financials do |booking|
      partner = booking.partner
      base = {
        account_type: partner ? "partner" : "direct",
        total:        booking.total,
        amount_paid:  booking.amount_paid,
        outstanding:  booking.outstanding_balance
      }
      if partner
        base.merge(
          partner_name:     partner.name,
          platform_fee_pct: partner.platform_fee_pct,
          provider_share:   (booking.amount_paid * partner.partner_share_pct / 100).round(2),
          payout_status:    booking.partner_payout_id ? "settled" : "owed"
        )
      else
        base.merge(
          tips:               booking.tips.sum(:amount),
          fuel_reimbursement: booking.shifts.sum(:fuel_reimbursement)
        )
      end
    end
  end

  # ── Job view (the assigned tech's single-job screen) ──────────────────────
  # Everything :full has, plus who the client is (name, visits so far) and the
  # clock record. Only for one booking at a time (the counts would be N+1 on a
  # list).
  view :job do
    include_view :full

    field :client do |booking|
      user = booking.user
      next unless user

      {
        user_id: user.id, # to open a chat with them
        name: [ user.first_name, user.last_name ].compact.join(" ").presence,
        completed_visits: user.bookings.where(status: "completed").where.not(id: booking.id).count
      }
    end

    field :visit do |booking|
      shift = booking.shifts.max_by(&:clock_in_at)
      next unless shift

      { clock_in_at: shift.clock_in_at, clock_out_at: shift.clock_out_at, distance_km: shift.distance_km }
    end
  end
end
