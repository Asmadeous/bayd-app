class MagicLinkMailer < ApplicationMailer
  def sign_in(user, raw_token)
    @user = user
    # Points at the API (not the frontend) — AuthController#verify_magic_link
    # validates the token, then 302s the browser to the frontend's
    # /auth/callback with a real JWT, same as the Google OAuth flow.
    @sign_in_url = api_v1_auth_magic_link_verify_url(token: raw_token)
    @expires_in_minutes = (MagicLinkToken::TTL / 60).to_i

    mail(to: user.email, subject: "Your Beauty @ Your Door sign-in link")
  end

  def password_reset(user, raw_token)
    @user = user
    # Points at the FRONTEND reset-password page (unlike sign_in) — the
    # customer needs to type a new password there, which then POSTs to
    # AuthController#reset_password with the token.
    @reset_url = "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/reset-password?token=#{raw_token}"
    @expires_in_minutes = (MagicLinkToken::TTL / 60).to_i

    mail(to: user.email, subject: "Reset your Beauty @ Your Door password")
  end
end
