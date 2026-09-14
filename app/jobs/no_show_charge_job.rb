# Charges the flat no-show fee to a customer's card on file after a booking is
# marked no_show. Best-effort and idempotent: it no-ops when the fee is off, the
# customer has no card, or a no-show charge was already recorded for the booking.
# A charge failure is logged, never raised - marking a booking no_show must always
# succeed regardless of whether the card could be billed.
class NoShowChargeJob < ApplicationJob
  queue_as :default

  NOTE_PREFIX = "No-show fee".freeze

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    return unless booking&.no_show?

    fee = Setting.no_show_fee
    return if fee <= 0

    # Idempotency: one no-show charge per booking.
    return if booking.payments.where(processor: "square_no_show").exists?

    user = booking.user
    return unless user&.card_on_file? && user.square_customer_id.present?

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

    NotificationService.deliver(
      user: user, kind: :booking_no_show,
      title: "No-show fee charged",
      body: "A #{ActiveSupport::NumberHelper.number_to_currency(fee)} no-show fee was charged for your missed #{booking.service.name} appointment.",
      booking: booking
    )
  rescue StandardError => e
    Rails.logger.warn("[NoShowChargeJob] booking #{booking_id} failed: #{e.message}")
  end
end
