class ApplicationMailer < ActionMailer::Base
  # From MUST be the mailbox we authenticate as (SMTP_USERNAME = noreply@baydspa.ca).
  # SpaceMail drops mail whose From isn't owned by the authenticated user, so a
  # mismatched default here silently breaks all delivery. Keep this aligned.
  # The address stays that one mailbox for every franchise; only the display name
  # and reply-to are the franchise's own.
  default from: -> { ApplicationMailer.from_for(Franchise.current) },
          reply_to: -> { Franchise.current.reply_to_email.presence || Franchise.current.contact_email.presence }

  def self.from_for(franchise)
    address = Mail::Address.new(ENV.fetch("MAIL_FROM", "Beauty @ Your Door <noreply@baydspa.ca>"))
    address.display_name = franchise.display_name
    address.format
  end
  layout "mailer"
end
