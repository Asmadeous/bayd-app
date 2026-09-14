class BookingSerializer < Blueprinter::Base
  identifier :id
  fields :status, :starts_at, :ends_at, :subtotal, :travel_fee, :total,
         :notes, :cancellation_reason, :created_at, :client_type, :party_size,
         :recurrence_active, :recurrence_interval_weeks, :auto_charge,
         :payment_timing, :payment_status, :deposit_amount,
         :booked_for_name, :booked_for_phone, :overtime_amount,
         :service_latitude, :service_longitude, :reschedule_count, :parent_booking_id

  field :outstanding_balance do |booking|
    booking.outstanding_balance
  end

  # Per-booking money picture for the staff history view, rendered ACCORDING TO
  # the tech's account type (the two never mix):
  #   • Partner provider → the partner keeps partner_share_pct of the service
  #     total; show that share + payout status. NO fuel (partners aren't
  #     reimbursed) and no individual tip line - it flows through the partner.
  #   • Direct (solo) staff → the amount they were paid, their tips, and their
  #     fuel reimbursement. No partner fields.
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

  # Extra services the customer added to this visit. They are note-only (the same
  # tech does them back-to-back — NOT a separate booking), stored on raw["addons"]
  # as [{ id, name, price, duration }]. Empty when none.
  field :addons do |booking|
    booking.raw["addons"] || []
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

  association :service,          blueprint: ServiceSerializer
  association :employee_profile, blueprint: EmployeeProfileSerializer
  association :meeting,          blueprint: MeetingSerializer
  association :address,          blueprint: AddressSerializer
end
