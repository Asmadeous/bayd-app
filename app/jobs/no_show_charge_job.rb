# Handles a booking marked no_show (the customer wasn't there): charges the flat
# no-show fee to their card on file when one applies, then tells the customer they
# missed the appointment. Best-effort and idempotent: one no-show charge and one
# no-show notification per booking. The charge no-ops when the fee is off or there
# is no card; the notification goes out either way. Failures are logged, never
# raised - marking a booking no_show must always succeed.
class NoShowChargeJob < ApplicationJob
  queue_as :default

  NOTE_PREFIX = "No-show fee".freeze

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    return unless booking&.no_show?

    user = booking.user
    return unless user

    charged = charge_fee(booking, user)
    notify(booking, user, charged)
  rescue StandardError => e
    Rails.logger.warn("[NoShowChargeJob] booking #{booking_id} failed: #{e.message}")
  end

  private

  # Returns the fee charged on this run, or nil when nothing was charged.
  def charge_fee(booking, user)
    fee = Setting.no_show_fee
    return if fee <= 0
    return if booking.payments.where(processor: "square_no_show").exists?
    return unless user.card_on_file? && user.square_customer_id.present?

    result = SquareService.charge_card(
      customer_id: user.square_customer_id,
      card_id: user.square_card_id,
      amount_cents: (fee * 100).to_i,
      note: "#{NOTE_PREFIX} - #{booking.service.name} ##{booking.id}"
    )

    unless result[:success]
      Rails.logger.warn("[NoShowChargeJob] booking #{booking.id} charge failed: #{result[:error]}")
      return
    end

    booking.payments.create!(
      amount: fee, status: "paid", method: "card",
      processor: "square_no_show", processor_ref: result[:payment_id], paid_at: Time.current
    )
    fee
  end

  def notify(booking, user, charged)
    return if Notification.exists?(user: user, booking: booking, kind: :booking_no_show)

    svc = booking.service&.name || "appointment"
    when_str = booking.starts_at.in_time_zone(BusinessHours.zone).strftime("%b %-d at %-l:%M %p")
    fee_line = charged ? " A #{ActiveSupport::NumberHelper.number_to_currency(charged)} no-show fee was charged to your card on file." : ""

    NotificationService.deliver(
      user: user, kind: :booking_no_show,
      title: "You missed your appointment",
      body: "Your technician arrived for your #{svc} on #{when_str} but couldn't reach you.#{fee_line} Book again anytime.",
      booking: booking
    )
  end
end
