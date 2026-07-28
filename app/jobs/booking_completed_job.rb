# Runs after a booking becomes "completed". Idempotent — safe to run more than
# once for the same booking. Handles loyalty, the review request, referral
# rewards, and a rebook nudge. Recurrence is owned by Subscription (the
# scheduler creates future bookings on a fixed cadence), so this job no longer
# rebooks — it only nudges one-off bookings.
class BookingCompletedJob < ApplicationJob
  queue_as :default

  LOYALTY_POINTS_PER_DOLLAR = 1
  REFERRAL_BONUS_POINTS     = 200

  def perform(booking_id)
    booking = Booking.find_by(id: booking_id)
    return unless booking&.completed?

    award_loyalty(booking)
    request_review(booking)
    handle_referral(booking)
    Invoice.generate_for(booking)

    # Only nudge non-subscription bookings; subscription bookings recur on their own.
    nudge_rebook(booking) unless booking.subscription_id
  end

  private

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")

  def award_loyalty(booking)
    return if booking.loyalty_transactions.where(kind: "earn").exists?

    points = booking.total.to_f.floor * LOYALTY_POINTS_PER_DOLLAR
    return if points <= 0

    account = booking.user.loyalty_account || booking.user.create_loyalty_account
    account.earn!(points, booking: booking, description: "Service: #{booking.service.name}")

    NotificationService.deliver(
      user: booking.user, kind: :loyalty_earned,
      title: "You earned #{points} loyalty points",
      body: "Thanks for booking #{booking.service.name}. Your points are ready to redeem.",
      booking: booking, action_url: "#{app_url}/dashboard/customer/loyalty"
    )
  rescue ActiveRecord::RecordNotUnique
    # A concurrent run already awarded for this booking (unique index guard).
    nil
  end

  def request_review(booking)
    return if booking.review.present?
    return if booking.user.notifications.kind_review_request.where(booking_id: booking.id).exists?

    NotificationService.deliver(
      user: booking.user, kind: :review_request,
      title: "How was your #{booking.service.name}?",
      body: "Rate your technician and help others find great service — leave a review to earn bonus points.",
      booking: booking,
      action_url: "#{app_url}/dashboard/customer/bookings",
      metadata: { cta: "Leave a review" }
    )
  end

  def handle_referral(booking)
    user = booking.user
    referrer = user.referred_by
    return unless referrer
    # Only on the referred user's first completed booking.
    return unless user.bookings.completed.count == 1

    account = referrer.loyalty_account || referrer.create_loyalty_account
    account.earn!(REFERRAL_BONUS_POINTS, description: "Referral bonus: #{user.email}")

    NotificationService.deliver(
      user: referrer, kind: :referral_offer,
      title: "You earned #{REFERRAL_BONUS_POINTS} referral points!",
      body: "#{user.first_name.presence || 'A friend'} you referred just completed their first service. Thank you!",
      action_url: "#{app_url}/dashboard/customer/loyalty"
    )
  end

  def nudge_rebook(booking)
    NotificationService.deliver(
      user: booking.user, kind: :rebook_nudge,
      title: "Loved your service? Book it again",
      body: "Rebook #{booking.service.name}, or set it to repeat automatically so you never miss an appointment.",
      booking: booking,
      action_url: "#{app_url}/dashboard/customer/book",
      metadata: { cta: "Rebook now" }
    )
  end
end
