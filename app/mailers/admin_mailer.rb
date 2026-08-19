class AdminMailer < ApplicationMailer
  # Team heads-up: a customer booked by phone (no email), so it couldn't be
  # auto-synced to SimplyBook. The admin calls them back and books manually.
  # All the booking details the admin needs are in the callback request's notes.
  def booking_follow_up(callback_request)
    @cr = callback_request
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"))
    mail(to: to, subject: "Phone booking follow-up — #{@cr.contact_name.presence || @cr.contact_phone}")
  end
end
