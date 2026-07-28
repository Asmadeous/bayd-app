class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "Beauty at Your Door <hello@baydspa.ca>")
  layout "mailer"
end
