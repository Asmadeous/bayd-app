class CustomerMailer < ApplicationMailer
  # One generic template renders any notification (review request, rebook nudge,
  # referral offer, …). Keeps the email and in-app notification perfectly in sync.
  def notify(notification)
    @notification = notification
    @user = notification.user
    @action_url = notification.action_url

    mail(to: @user.email, subject: notification.title)
  end
end
