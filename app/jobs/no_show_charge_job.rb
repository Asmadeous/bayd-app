# Handles a booking marked no_show (the customer wasn't there): charges the
# booking's full unpaid balance to their card on file, then tells the customer they
# missed the appointment. When the balance can't be charged (no card, declined),
# it stays outstanding and every admin is alerted to collect it by hand.
# Best-effort and idempotent: one no-show charge, one customer notification and
# one admin alert per booking. Failures are logged, never raised - marking a
# booking no_show must always succeed.
class NoShowChargeJob < ApplicationJob
  queue_as :default

  NOTE_PREFIX = "No-show".freeze

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    return unless booking&.no_show?

    user = booking.user
    return unless user

    charged, failure = charge_balance(booking, user)
    notify(booking, user, charged, failure)
    alert_admins(booking, failure) if failure
  rescue StandardError => e
    Rails.logger.warn("[NoShowChargeJob] booking #{booking_id} failed: #{e.message}")
  end

  private

  # Returns [amount charged, failure reason]; both nil when nothing was owed.
  def charge_balance(booking, user)
    return [ nil, nil ] if booking.payments.where(processor: "square_no_show").exists?

    amount = booking.outstanding_balance
    return [ nil, nil ] if amount <= 0

    profile = user.payment_profile(booking.franchise)
    return [ nil, "No card on file" ] unless profile&.card_on_file? && profile.customer_ref.present?

    result = Current.set(franchise: booking.franchise) do
      SquareService.charge_card(
        customer_id: profile.customer_ref,
        card_id: profile.card_ref,
        amount_cents: booking.franchise.minor_units(amount),
        note: "#{NOTE_PREFIX} - #{booking.service.name} ##{booking.id}"
      )
    end

    unless result[:success]
      Rails.logger.warn("[NoShowChargeJob] booking #{booking.id} charge failed: #{result[:error]}")
      return [ nil, "Card charge failed: #{result[:error].presence || 'declined'}" ]
    end

    booking.payments.create!(
      amount: amount, status: "paid", method: "card",
      processor: "square_no_show", processor_ref: result[:payment_id], paid_at: Time.current
    )
    [ amount, nil ]
  end

  def notify(booking, user, charged, failure)
    return if Notification.exists?(user: user, booking: booking, kind: :booking_no_show)

    svc = booking.service&.name || "appointment"
    fee_line =
      if charged
        " The #{money(charged)} owed for the booking was charged to your card on file."
      elsif failure
        " The #{money(booking.outstanding_balance)} for the booking is still owed, and our team will be in touch to collect it."
      else
        ""
      end

    NotificationService.deliver(
      user: user, kind: :booking_no_show,
      title: "You missed your appointment",
      body: "Your technician arrived for your #{svc} on #{local_time(booking)} but couldn't reach you.#{fee_line} Book again anytime.",
      booking: booking
    )
  end

  # The email goes out once, on the run that raises the first alert, so a
  # re-run never re-mails the team.
  def alert_admins(booking, failure)
    first_alert = !Notification.exists?(booking: booking, kind: :booking_no_show_uncollected)
    customer = booking.user.first_name.presence || "A customer"
    owed = money(booking.outstanding_balance)

    User.franchise_admins(booking.franchise).find_each do |admin|
      next if Notification.exists?(user: admin, booking: booking, kind: :booking_no_show_uncollected)

      NotificationService.deliver(
        user: admin, kind: :booking_no_show_uncollected,
        title: "No-show not collected",
        body: "#{customer} was a no-show for #{booking.service&.name || 'a booking'} on #{local_time(booking)}. #{owed} is still owed. #{failure}.",
        booking: booking,
        action_url: "#{app_url}/dashboard/admin/bookings"
      )
    end

    AdminMailer.no_show_uncollected(booking, failure).deliver_later if first_alert
  end

  def money(amount) = Franchise.current.money(amount)

  def local_time(booking)
    booking.starts_at.in_time_zone(BusinessHours.zone).strftime("%b %-d at %-l:%M %p")
  end

  # Absolute frontend URL so the link works outside the app (email, push).
  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
