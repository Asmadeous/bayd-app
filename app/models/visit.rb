# One customer appointment made of one or more services. Each service is its own
# Booking (its own tech, job, clock-in, payment and payout), done back-to-back in
# `visit_position` order. Status and money are always derived from the bookings
# so the visit can never disagree with what the techs actually did.
class Visit < ApplicationRecord
  include FranchiseScoped

  belongs_to :user
  belongs_to :address, optional: true

  has_many :bookings, -> { order(:visit_position) }, dependent: :nullify, inverse_of: :visit
  has_one  :invoice, as: :invoiceable, dependent: :nullify

  enum :client_type, { adult: "adult", kids: "kids", elderly: "elderly", group: "group" }, prefix: true
  enum :payment_timing, { pay_upfront: "pay_upfront", pay_after: "pay_after" }, prefix: :timing

  validates :starts_at, :ends_at, presence: true

  # Most "live" line wins: anything still happening or due keeps the visit open.
  def status
    statuses = bookings.map(&:status)
    return "pending" if statuses.empty?

    %w[in_progress pending confirmed].each { |s| return s if statuses.include?(s) }
    return "cancelled" if statuses.all?("cancelled")

    %w[completed no_show missed].find { |s| statuses.include?(s) } || "cancelled"
  end

  def active_bookings = bookings.select { |b| b.status.in?(Booking::ACCESS_STATUSES) }

  def subtotal = bookings.sum { |b| b.subtotal.to_d }
  def total    = bookings.sum { |b| b.total.to_d }
  def amount_paid = bookings.sum(&:amount_paid)
  def outstanding_balance = bookings.sum(&:outstanding_balance)

  # A group visit takes a deposit on the whole visit (not per line): the admin
  # percentage of the total, at least the minimum, never more than the total.
  def required_deposit
    return 0.to_d unless client_type_group?

    pct_based = (total * Setting.group_deposit_pct / 100).round(2)
    [ [ pct_based, Setting.group_deposit_min ].max, total ].min
  end

  # Settle money that arrived for the whole visit, so every tech's booking
  # carries its own share. A VST- link left a pending payment per line with its
  # exact share (the webhook amount also includes any tip), so those settle as
  # recorded; otherwise the amount is split by what each line still owes.
  def mark_paid!(processor:, reference: nil, amount: nil, method: "card")
    lines = bookings.reject(&:cancelled?)
    pending = lines.filter_map { |b| [ b, b.payments.find_by(status: "pending") ] if b.payments.exists?(status: "pending") }
    if pending.any?
      pending.each do |booking, payment|
        booking.mark_paid!(processor: processor, reference: reference, amount: payment.amount, method: method)
      end
      return
    end

    owed = lines.map(&:outstanding_balance)
    VisitPaymentService.split((amount || owed.sum).to_d, owed).zip(lines).each do |share, booking|
      booking.mark_paid!(processor: processor, reference: reference, amount: share, method: method) if share.positive?
    end
  end

  # Every line has run its course (done, cancelled, no-show or missed).
  def finished? = bookings.none? { |b| b.status.in?(Booking::ACCESS_STATUSES) }

  # One invoice for the whole visit, once its last line is finished and at
  # least one service was performed. Idempotent (Invoice.generate_for).
  def issue_invoice_if_finished
    reload
    Invoice.generate_for(self) if finished? && bookings.any?(&:completed?)
  end

  # The lines still due (cancelled ones dropped), in visit order.
  def live_lines = bookings.select { |b| b.status.in?(Booking::RESCHEDULABLE_STATUSES) }

  def shared? = bookings.reject(&:cancelled?).map(&:employee_profile_id).uniq.size > 1

  # Move the whole visit to new_start, its services still back-to-back. Re-plans
  # who does what (techs may change) unless keep_techs, used when a tech moves
  # their own visit. Raises Booking::RescheduleError(:not_reschedulable |
  # :outside_hours | :no_availability | :slot_taken).
  def reschedule!(new_start:, by_customer: false, keep_techs: false)
    lines = live_lines
    started = bookings.any? { |b| b.status.in?(%w[in_progress completed no_show missed]) }
    raise Booking::RescheduleError.new(:not_reschedulable) if lines.empty? || started

    planner = VisitPlanner.new(
      services: lines.map(&:service), date: new_start.in_time_zone(BusinessHours.zone).to_date,
      customer_lat: service_latitude, customer_lng: service_longitude, postal_code: address&.postal_code,
      party_size: party_size, ignore_booking_ids: lines.map(&:id)
    )
    span = lines.sum { |b| b.service.duration_minutes * party_size }
    raise Booking::RescheduleError.new(:outside_hours) unless BusinessHours.open_for?(new_start, new_start + span.minutes)

    plan = keep_techs ? planner.plan_with(new_start, lines.map(&:employee_profile)) : planner.plan_at(new_start)
    raise Booking::RescheduleError.new(keep_techs ? :slot_taken : :no_availability) unless plan

    before = lines.to_h { |b| [ b.id, b.employee_profile ] }
    move_lines!(lines, plan, by_customer)
    notify_rescheduled(lines, before)
    lines.each { |b| BookingReminders.schedule(b) if b.confirmed? }
    self
  end

  # Cancel every line still due. The customer hears once, naming every service;
  # each tech is still told about their own job (BookingCancelledJob).
  def cancel!(reason: nil)
    lines = live_lines
    return self if lines.empty?

    transaction do
      lines.each do |b|
        b.quiet_customer_cancel = true
        b.update!(status: "cancelled", cancellation_reason: reason)
      end
    end
    notify_cancelled(lines)
    self
  end

  # Keep the cached span in step with the lines after any of them move. Cancelled
  # lines are ignored unless nothing else is left.
  def sync_window!
    lines = active_bookings.presence || bookings.to_a
    return if lines.empty?

    update!(starts_at: lines.map(&:starts_at).min, ends_at: lines.map(&:ends_at).max)
  end

  private

  # Lines may trade places or overlap their own old times mid-update, so the
  # double-booking check is deferred and then forced once every line has moved.
  def move_lines!(lines, plan, by_customer)
    transaction(requires_new: true) do
      self.class.connection.execute("SET CONSTRAINTS no_double_booking DEFERRED")
      lines.zip(plan).each do |booking, line|
        booking.update!(employee_profile: line.employee, partner_id: line.employee.partner_id,
                        starts_at: line.starts_at, ends_at: line.ends_at,
                        reschedule_count: booking.reschedule_count + (by_customer ? 1 : 0))
      end
      self.class.connection.execute("SET CONSTRAINTS no_double_booking IMMEDIATE")
      update!(starts_at: plan.first.starts_at, ends_at: plan.last.ends_at)
    end
  rescue ActiveRecord::StatementInvalid => e
    raise unless e.cause.is_a?(PG::ExclusionViolation)

    raise Booking::RescheduleError.new(:slot_taken)
  end

  def when_label(at) = at.in_time_zone(BusinessHours.zone).strftime("%A, %b %-d at %-l:%M %p")

  def service_names(lines) = lines.filter_map { |b| b.service&.name }.join(" + ")

  # Customer once; a tech who keeps their line hears it moved; a tech who lost
  # a line hears it went to someone else. A newly assigned tech is told by the
  # "assigned" reminder, so they aren't told twice.
  def notify_rescheduled(lines, before)
    techs = lines.filter_map { |b| b.employee_profile&.user&.first_name }.uniq.to_sentence
    NotificationService.deliver(
      user: user, kind: "booking_rescheduled", title: "Your appointment was rescheduled",
      body: "#{service_names(lines)} is now #{when_label(starts_at)} with #{techs}.", booking: lines.first
    )
    lines.each do |b|
      previous = before[b.id]
      if previous&.id == b.employee_profile_id
        NotificationService.deliver(
          user: b.employee_profile.user, kind: "booking_rescheduled", title: "Booking rescheduled",
          body: "#{b.service.name} for #{user.first_name} is now #{when_label(b.starts_at)}.", booking: b
        ) if b.employee_profile&.user
      elsif previous&.user
        NotificationService.deliver(
          user: previous.user, kind: "booking_rescheduled", title: "Booking moved to another technician",
          body: "#{b.service.name} for #{user.first_name} was moved to a new time with another technician. It's off your schedule.",
          booking: b
        )
      end
    end
  rescue StandardError => e
    Rails.logger.warn("[Visit##{id}] reschedule notify failed: #{e.message}")
  end

  def notify_cancelled(lines)
    NotificationService.deliver(
      user: user, kind: "booking_cancelled", title: "Your appointment was cancelled",
      body: "Your #{service_names(lines)} on #{when_label(lines.first.starts_at)} was cancelled. Book again anytime.",
      booking: lines.first
    )
  rescue StandardError => e
    Rails.logger.warn("[Visit##{id}] cancel notify failed: #{e.message}")
  end
end
