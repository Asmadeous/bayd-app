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

  private

  def on_completed
    BookingCompletedJob.perform_later(id)
  end

  def ends_after_starts
    return unless starts_at && ends_at
    errors.add(:ends_at, "must be after starts_at") if ends_at <= starts_at
  end
end
