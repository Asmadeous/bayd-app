class Subscription < ApplicationRecord
  LEAD_DAYS = 5 # create the next booking up to this many days before it's due
  UNITS = %w[day week month year].freeze

  belongs_to :user
  belongs_to :service
  belongs_to :address, optional: true
  has_many   :bookings, dependent: :nullify

  enum :status, { active: "active", paused: "paused", cancelled: "cancelled" }, prefix: true

  validates :interval_unit, inclusion: { in: UNITS }
  validates :interval_count, numericality: { only_integer: true, greater_than: 0 }
  validates :next_run_at, presence: true
  validates :client_type, inclusion: { in: Service::CLIENT_TYPES }

  # Active subscriptions whose next appointment falls within the lead window.
  scope :due, -> { status_active.where("next_run_at <= ?", Time.current + LEAD_DAYS.days) }

  def self.duration_for(unit, count)
    count.to_i.public_send(unit.to_s.pluralize) # e.g. 3.months, 1.year, 1.day
  end

  # Start a subscription from the customer's first (just-created) booking.
  def self.start_from(booking, interval_unit:, interval_count:, auto_charge:)
    sub = create!(
      user: booking.user, service: booking.service, address: booking.address,
      client_type: booking.client_type,
      interval_unit: interval_unit, interval_count: interval_count, auto_charge: auto_charge,
      price: booking.total, status: "active", started_at: Time.current,
      next_run_at: booking.starts_at + duration_for(interval_unit, interval_count)
    )
    booking.update!(subscription: sub)
    sub
  end

  def cadence
    self.class.duration_for(interval_unit, interval_count)
  end

  # Human label e.g. "Daily", "Weekly", "Every 2 weeks", "Every 3 months", "Yearly".
  def frequency_label
    return "Daily"  if interval_unit == "day" && interval_count == 1
    return "Weekly" if interval_unit == "week" && interval_count == 1
    return "Monthly" if interval_unit == "month" && interval_count == 1
    return "Yearly" if interval_unit == "year" && interval_count == 1

    "Every #{interval_count} #{interval_unit.pluralize(interval_count)}"
  end

  # ── Lifecycle (customer/admin controlled) ──────────────────────────────────
  def pause!  = update!(status: "paused", paused_at: Time.current)
  def cancel! = update!(status: "cancelled", cancelled_at: Time.current)

  def resume!
    roll_forward_until_future
    update!(status: "active", paused_at: nil)
  end

  def skip_next!
    update!(next_run_at: next_run_at + cadence)
  end

  # Change cadence and reschedule the next appointment from the last one (or now),
  # rolled to a future slot. Not allowed once cancelled.
  def change_frequency!(unit, count)
    unit = unit.to_s
    count = count.to_i
    raise ArgumentError, "invalid frequency" unless UNITS.include?(unit) && count.positive?
    raise ArgumentError, "subscription is cancelled" if status_cancelled?

    step = self.class.duration_for(unit, count)
    base = last_booking_at || started_at || Time.current
    nr = base + step
    nr += step while nr <= Time.current
    update!(interval_unit: unit, interval_count: count, next_run_at: nr)
  end

  # ── Scheduling (fixed cadence, driven by the scheduler job) ─────────────────
  # Creates the next appointment, charges per-appointment, advances the cadence.
  def generate_next_booking!
    return unless status_active?

    roll_forward_until_future
    request = user.booking_requests.create!(
      service: service, address: address, kind: "scheduled", client_type: client_type,
      requested_start: next_run_at,
      customer_latitude: address&.latitude, customer_longitude: address&.longitude
    )

    result = AssignmentService.new(request).call
    unless result.success?
      Rails.logger.warn("[Subscription #{id}] scheduling failed: #{result.error}")
      advance! # skip this cycle rather than retry the same failing slot forever
      return
    end

    booking = result.booking_request.booking
    booking.update!(subscription: self)
    charge_for(booking)
    advance!

    NotificationService.deliver(
      user: user, kind: :recurring_booked, booking: booking,
      title: "Your next #{service.name} is booked",
      body: "We scheduled your subscription appointment for #{booking.starts_at.strftime('%b %-d at %-l:%M %p')}.",
      action_url: "#{app_url}/dashboard/customer/bookings"
    )
    booking
  end

  private

  def advance!
    nb = next_run_at + cadence
    nb += cadence while nb <= Time.current
    update!(next_run_at: nb, last_booking_at: Time.current)
  end

  def roll_forward_until_future
    return if next_run_at > Time.current
    nb = next_run_at
    nb += cadence while nb <= Time.current
    self.next_run_at = nb
  end

  # Per-appointment charge via the Square card on file. On failure the appointment is
  # cancelled and the customer is asked to update their card.
  def charge_for(booking)
    return unless auto_charge && user.card_on_file?

    result = SquareService.charge_card(
      customer_id: user.square_customer_id, card_id: user.square_card_id,
      amount_cents: (booking.total.to_f * 100).round, note: "SUB-#{id}-#{booking.id}"
    )

    if result[:success]
      booking.payments.create!(
        amount: booking.total, status: "paid", method: "card",
        processor: "square", processor_ref: result[:payment_id], paid_at: Time.current
      )
    else
      booking.update!(status: "cancelled", cancellation_reason: "Subscription auto-payment failed")
      NotificationService.deliver(
        user: user, kind: :charge_failed, booking: booking,
        title: "We couldn't process your subscription payment",
        body: "Your card on file couldn't be charged for your #{service.name} subscription. Please update your payment method.",
        action_url: "#{app_url}/dashboard/customer/settings"
      )
    end
  end

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
