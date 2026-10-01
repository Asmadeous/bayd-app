class NewsletterMailer < ApplicationMailer
  def new_post(blog_post, subscriber)
    @blog_post = blog_post
    @post_url = "#{ENV.fetch('BLOG_URL', 'https://baydspa.ca')}/blog/#{blog_post.slug}"
    newsletter_mail(subscriber, "New on the blog: #{blog_post.title}")
  end

  def campaign(campaign, subscriber)
    @campaign = campaign
    newsletter_mail(subscriber, campaign.subject)
  end

  # A test send to the admin writing the newsletter, before it goes to everyone.
  # The unsubscribe link is a placeholder, since the admin isn't a subscriber.
  def campaign_preview(campaign, email)
    @campaign = campaign
    @unsubscribe_url = "#{app_url}/newsletter/unsubscribed"
    @mailing_address = Setting.get("invoice_business_address")
    mail(to: email, subject: "[Test] #{campaign.subject}", template_name: "campaign")
  end

  def welcome(subscriber)
    newsletter_mail(subscriber, "You're subscribed to Beauty @ Your Door")
  end

  private

  # Every newsletter carries a one-click unsubscribe (link + List-Unsubscribe
  # header) and the business mailing address, which Canada's anti-spam law
  # (CASL) requires in commercial email.
  def newsletter_mail(subscriber, subject)
    @subscriber = subscriber
    # One-click unsubscribe hits the API directly; it then sends the browser to
    # the website's confirmation page.
    @unsubscribe_url = api_v1_newsletter_unsubscribe_url(token: subscriber.unsubscribe_token)
    @mailing_address = Setting.get("invoice_business_address")
    headers["List-Unsubscribe"] = "<#{@unsubscribe_url}>"
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    mail(to: subscriber.email, subject: subject)
  end

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
