class Booking < ApplicationRecord
  belongs_to :user
  belongs_to :employee_profile
  belongs_to :service
  belongs_to :booking_request, optional: true
  belongs_to :address, optional: true

  has_many :payments, as: :payable, dependent: :destroy
  has_many :tips, dependent: :destroy
  has_many :gift_card_transactions, dependent: :nullify
  has_many :loyalty_transactions, dependent: :nullify
  has_one  :review, dependent: :destroy
  has_one  :invoice, as: :invoiceable, dependent: :nullify
  has_one  :meeting, dependent: :destroy

  belongs_to :parent_booking, class_name: "Booking", optional: true
  has_many   :child_bookings, class_name: "Booking", foreign_key: :parent_booking_id, dependent: :nullify
  belongs_to :subscription, optional: true
  belongs_to :partner, optional: true
  belongs_to :partner_payout, optional: true

  enum :status, {
    pending:     "pending",
    confirmed:   "confirmed",
    in_progress: "in_progress",
    completed:   "completed",
    cancelled:   "cancelled",
    no_show:     "no_show"
  }

  enum :client_type, {
    adult:   "adult",
    kids:    "kids",
    elderly: "elderly",
    group:   "group"
  }, prefix: true

  # WHEN the customer chose to pay. Group bookings still take a deposit upfront.
  enum :payment_timing, {
    pay_upfront: "pay_upfront",
    pay_after:   "pay_after"
  }, prefix: :timing

  # Payment lifecycle, independent of timing.
  enum :payment_status, {
    unpaid:       "unpaid",
    deposit_paid: "deposit_paid",
    paid:         "paid",
    refunded:     "refunded"
  }, prefix: :payment

  validates :starts_at, :ends_at, presence: true
  validates :subtotal, :travel_fee, :total, numericality: { greater_than_or_equal_to: 0 }
  validates :simplybook_id, uniqueness: true, allow_nil: true
  validate  :ends_after_starts

  # Kick off the post-service flow (loyalty, review request, auto-rebook) the
  # moment a booking transitions into "completed", regardless of which path
  # (admin, employee, sync) made the change.
  after_update_commit :on_completed, if: -> { saved_change_to_status? && completed? }

  scope :upcoming,  -> { where(status: %w[confirmed]).where("starts_at > ?", Time.current) }
  scope :active,    -> { where(status: %w[confirmed in_progress]) }
  # Local bookings not yet pushed to SimplyBook (e.g. created while SimplyBook
  # was unreachable) — the reconcile job retries these.
  scope :needs_simplybook_sync, lambda {
    where(simplybook_id: nil, status: %w[pending confirmed in_progress])
  }

  # Recurring bookings due to be re-created: active recurrence, completed,
  # and no follow-up booking spawned yet.
  scope :awaiting_rebook, lambda {
    where(recurrence_active: true, status: "completed")
      .where.not(id: Booking.where.not(parent_booking_id: nil).select(:parent_booking_id))
  }

  # The customer's first-ever booking (no other bookings on record).
  def first_time_client?
    !Booking.where(user_id: user_id).where.not(id: id).exists?
  end

  # Work-scope video call is offered only to special-needs and first-time
  # clients; existing clients are already onboarded and don't need one. The
  # booking itself never depends on the call happening.
  def meeting_recommended?
    return true if user&.special_needs?

    first_time_client?
  end

  def recurring? = recurrence_active? && recurrence_interval_weeks.present?

  # ── Payment helpers ─────────────────────────────────────────────────────────

  # Group bookings require a deposit (admin-configurable %). Returns the $ amount
  # to collect upfront, or 0 for non-group bookings.
  # Group bookings take a deposit up front: the higher of the admin percentage
  # or the minimum (default $50), never more than the total.
  def required_deposit
    return 0.to_d unless client_type_group?

    pct_based = (total.to_d * Setting.group_deposit_pct / 100).round(2)
    [ [ pct_based, Setting.group_deposit_min ].max, total.to_d ].min
  end

  def amount_paid
    payments.where(status: "paid").sum(:amount)
  end

  # What still needs collecting to settle the booking in full.
  def outstanding_balance
    [ total.to_d - amount_paid, 0.to_d ].max
  end

  def fully_paid?
    outstanding_balance <= 0
  end

  # Settle a confirmed payment (from auto-charge or a webhook). Reuses a pending
  # payment row if one exists (payment-link path), else creates one.
  def mark_paid!(processor:, reference: nil, amount: nil)
    amt = (amount || outstanding_balance).to_d
    payment = payments.find_by(status: "pending")
    if payment
      payment.update!(status: "paid", processor: processor, processor_ref: reference,
                      amount: amt, paid_at: Time.current)
    else
      payments.create!(amount: amt, status: "paid", method: "card",
                       processor: processor, processor_ref: reference, paid_at: Time.current)
    end
    refresh_payment_status!
  end

  # Recompute payment_status from what's actually been paid.
  def refresh_payment_status!
    if fully_paid?
      payment_paid!
    elsif amount_paid.positive?
      payment_deposit_paid!
    end
    return unless status == "pending" && payment_status.in?(%w[deposit_paid paid])

    # A booking held for mandatory payment becomes confirmed once money lands.
    # Defer the exclusion check so flipping pending→confirmed on the already-held
    # slot doesn't self-conflict on no_double_booking.
    self.class.transaction do
      self.class.connection.execute("SET CONSTRAINTS no_double_booking DEFERRED")
      update!(status: "confirmed")
    end
  end

  # When the next appointment in this series should start.
  def next_occurrence_at
    return unless recurring?
    starts_at + recurrence_interval_weeks.weeks
  end

  # Raised by reschedule! with a machine-readable :reason the controller maps to
  # an HTTP status + message. Keeps the model free of HTTP concerns.
  class RescheduleError < StandardError
    attr_reader :reason
    def initialize(reason) = (@reason = reason) && super(reason.to_s)
  end

  RESCHEDULABLE_STATUSES = %w[confirmed pending].freeze

  # Move this booking to new_start. Re-validates business hours, travel
  # feasibility for the SAME tech, and the no_double_booking DB constraint, then
  # best-effort edits the SimplyBook booking (PUT — a real edit, not
  # cancel+recreate) so SimplyBook fires its own client SMS/email. Notifies the
  # customer + tech in-app and by email. `by_customer:` increments the reschedule
  # counter and is what the controller caps (admin passes false → uncapped).
  # Raises RescheduleError(:not_reschedulable|:outside_hours|:not_reachable|:slot_taken).
  # `new_employee` (optional): admin can move the booking to a different tech in
  # the same action. Travel feasibility is checked against whichever tech ends up
  # assigned.
  def reschedule!(new_start:, by_customer: false, new_employee: nil)
    raise RescheduleError.new(:not_reschedulable) unless RESCHEDULABLE_STATUSES.include?(status)

    assigned = new_employee || employee_profile
    new_end = new_start + (service.duration_minutes * party_size).minutes
    raise RescheduleError.new(:outside_hours) unless within_business_hours?(new_start, new_end)

    tf = TravelFeasibility.new(employee: assigned, customer_lat: service_latitude, customer_lng: service_longitude)
    raise RescheduleError.new(:not_reachable) unless tf.feasible?(new_start, new_end)

    old_simplybook_id = simplybook_id
    begin
      with_lock do
        attrs = { starts_at: new_start, ends_at: new_end,
                  reschedule_count: reschedule_count + (by_customer ? 1 : 0) }
        attrs[:employee_profile] = new_employee if new_employee
        update!(attrs)
      end
    rescue ActiveRecord::StatementInvalid => e
      raise unless e.cause.is_a?(PG::ExclusionViolation) # only the double-booking guard
      raise RescheduleError.new(:slot_taken)
    end

    push_reschedule_to_simplybook(old_simplybook_id)
    notify_rescheduled
    self
  end

  private

  def on_completed
    BookingCompletedJob.perform_later(id)
  end

  # Both ends must fall within the business's open hours (local zone), and the
  # whole service must finish before close.
  def within_business_hours?(new_start, new_end)
    zone = BusinessHours.zone
    local_start = new_start.in_time_zone(zone)
    local_end   = new_end.in_time_zone(zone)
    return false unless new_end > new_start
    return false if local_start.hour < BusinessHours::OPEN_HOUR
    # end must be on the same day and not past close
    local_end.to_date == local_start.to_date &&
      (local_end.hour < BusinessHours::CLOSE_HOUR ||
       (local_end.hour == BusinessHours::CLOSE_HOUR && local_end.min.zero? && local_end.sec.zero?))
  end

  # Best-effort SimplyBook edit to the new time (PUT /admin/bookings/{id}).
  # Skips when unmapped/dormant. Never raises into the reschedule.
  def push_reschedule_to_simplybook(sb_id)
    return if sb_id.blank?
    return if ENV["SIMPLYBOOK_COMPANY"].blank?
    return if service.simplybook_event_id.blank? || employee_profile.simplybook_unit_id.blank?

    SimplyBook::Client.new.update_booking(
      sb_id,
      service_id: service.simplybook_event_id,
      unit_id:    employee_profile.simplybook_unit_id,
      starts_at:  starts_at,
      ends_at:    ends_at
    )
  rescue StandardError => e
    Rails.logger.warn("[Booking##{id}] SimplyBook reschedule push failed: #{e.message}")
  end

  # Notify the customer (in-app + email via NotificationService) and the tech
  # (in-app). NotificationService.deliver persists the Notification AND emails
  # it through CustomerMailer. Best-effort — never breaks a completed reschedule.
  def notify_rescheduled
    when_str = starts_at.in_time_zone(BusinessHours.zone).strftime("%A, %b %-d at %-l:%M %p")
    NotificationService.deliver(
      user: user, kind: "booking_rescheduled",
      title: "Your appointment was rescheduled",
      body: "#{service.name} is now #{when_str}.", booking: self
    )
    if (tech = employee_profile&.user)
      NotificationService.deliver(
        user: tech, kind: "booking_rescheduled",
        title: "A booking was rescheduled",
        body: "#{service.name} for #{user.first_name} is now #{when_str}.", booking: self
      )
    end
  rescue StandardError => e
    Rails.logger.warn("[Booking##{id}] reschedule notify failed: #{e.message}")
  end

  def ends_after_starts
    return unless starts_at && ends_at
    errors.add(:ends_at, "must be after starts_at") if ends_at <= starts_at
  end
end
