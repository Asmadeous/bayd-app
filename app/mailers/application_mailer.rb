class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "Beauty @ Your Door <Bookings@baydspa.ca>")
  layout "mailer"
end
