class AdminMailer < ApplicationMailer
  # Team heads-up: a customer booked by phone (no email), so it couldn't be
  # booked online. The admin calls them back and books manually. All the booking
  # details the admin needs are in the callback request's notes.
  def booking_follow_up(callback_request)
    @cr = callback_request
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"))
    mail(to: to, subject: "Phone booking follow-up — #{@cr.contact_name.presence || @cr.contact_phone}")
  end

  # Team heads-up: the customer requested add-on services for this visit. Add-ons
  # are NOT a separate booking — the same tech does them back-to-back with the
  # primary and factors in the extra time/charge on the day. This email lists them
  # so the team knows to allow for the extra work.
  def booking_addons(booking, addons)
    @booking = booking
    @addons  = Array(addons)
    @total   = @addons.sum { |a| a[:price].to_d }
    # EmployeeProfile has no name of its own — it comes from the associated user.
    u = booking.employee_profile&.user
    @technician_name = [ u&.first_name, u&.last_name ].compact_blank.join(" ").presence ||
                       "Technician ##{booking.employee_profile_id}"
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"))
    mail(to: to, subject: "Booking add-ons — ##{booking.id} #{booking.user.first_name}")
  end

  # Team heads-up: a no-show's balance couldn't be charged (no card on file, or
  # the card was declined), so it's still owed and needs collecting by hand.
  def no_show_uncollected(booking, reason)
    @booking = booking
    @reason  = reason
    @owed    = booking.outstanding_balance
    u = booking.employee_profile&.user
    @technician_name = [ u&.first_name, u&.last_name ].compact_blank.join(" ").presence ||
                       "Technician ##{booking.employee_profile_id}"
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"))
    mail(to: to, subject: "No-show not collected - ##{booking.id} #{booking.user.first_name}")
  end

  # Team heads-up: someone reported the other person in a chat. Review the
  # conversation and act on it promptly.
  def chat_reported(report)
    @report = report
    @reporter = [ report.reporter.first_name, report.reporter.last_name ].compact_blank.join(" ").presence || "User ##{report.reporter_id}"
    @reported = [ report.reported_user.first_name, report.reported_user.last_name ].compact_blank.join(" ").presence || "User ##{report.reported_user_id}"
    to = ENV.fetch("ADMIN_NOTIFY_EMAIL", ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"))
    mail(to: to, subject: "Chat report - #{@reported}: #{report.reason}")
  end
end
