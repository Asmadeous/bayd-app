class ApplicationMailer < ActionMailer::Base
  # From MUST be the mailbox we authenticate as (SMTP_USERNAME = noreply@baydspa.ca).
  # SpaceMail drops mail whose From isn't owned by the authenticated user, so a
  # mismatched default here silently breaks all delivery. Keep this aligned.
  default from: ENV.fetch("MAIL_FROM", "Beauty @ Your Door <noreply@baydspa.ca>")
  layout "mailer"
end
