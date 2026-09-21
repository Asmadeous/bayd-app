module Api
  module V1
    class AuthController < ApplicationController
      include ImageUploadValidation

      skip_before_action :authenticate_user!, only: %i[
        register login staff_login request_magic_link verify_magic_link
        request_password_reset reset_password request_phone_code verify_phone_code
        request_email_code verify_email_code
      ]

      # Customers: passwordless, email-keyed. register == login (find-or-create).
      def register
        provision_customer(created: true)
      end

      # Phone login (customers): text a one-time code. Always responds success
      # (even when SMS is unconfigured or rate-limited) so it can't be used to
      # probe which numbers exist or whether SMS is set up. A too-soon resend is
      # the one signal surfaced, so the app can show "please wait".
      def request_phone_code
        phone = params[:phone].to_s.strip
        return render(json: { error: "Phone number is required" }, status: :unprocessable_entity) if phone.blank?

        case PhoneOtp.request_code(phone)
        when :too_soon
          render json: { error: "Please wait a moment before requesting another code." }, status: :too_many_requests
        else
          render json: { status: "sent" }
        end
      end

      # Verify the code and log the customer in (find-or-create by phone). Returns
      # the same { token, user } shape as the other login paths. On SIGNUP the
      # client also sends email + first_name so the OTP-created account isn't
      # phone-only; they're applied only to a brand-new account (never overwrite an
      # existing customer's details on a later phone sign-in).
      def verify_phone_code
        user = PhoneOtp.verify(
          params[:phone].to_s, params[:code].to_s,
          email: params[:email].to_s, first_name: params[:first_name].to_s
        )
        return render(json: { error: "That code is invalid or has expired." }, status: :unauthorized) unless user

        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
      end

      # Email login (customers): email a one-time code. The in-app alternative to
      # the magic link, which can't complete inside the mobile app. Same privacy
      # posture as phone OTP; a staff/admin email is the one refusal.
      def request_email_code
        email = params[:email].to_s.strip
        return render(json: { error: "Email is required" }, status: :unprocessable_entity) if email.blank?

        case EmailOtp.request_code(email)
        when :too_soon
          render json: { error: "Please wait a moment before requesting another code." }, status: :too_many_requests
        when :staff
          render json: { error: "That email belongs to a staff account — please use staff sign-in." },
                 status: :forbidden
        else
          render json: { status: "sent" }
        end
      end

      # Verify the emailed code and log the customer in (find-or-create by email).
      # Returns the same { token, user } shape as the other login paths.
      def verify_email_code
        user = EmailOtp.verify(params[:email].to_s, params[:code].to_s)
        return render(json: { error: "That code is invalid or has expired." }, status: :unauthorized) unless user

        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
      end

      def login
        provision_customer(created: false)
      end

      # Dashboard sign-in for an EXISTING account: proves inbox ownership before
      # issuing a token (unlike #login, which trusts whatever email is typed —
      # fine right after a guest fills in their own details at checkout, but not
      # safe for "let me into an account that might not be mine"). Always
      # responds success regardless of whether the email exists, so this can't
      # be used to enumerate registered accounts — EXCEPT the one signal the
      # frontend already relies on: a staff/admin email 403s (same as the old
      # customer-login behaviour) so the sign-in form can reveal a password
      # field, since staff never get a magic link.
      def request_magic_link
        email = params[:email].to_s.downcase.strip
        user = User.find_by(email: email) if email.present?
        if user && !user.customer?
          return render(json: { error: "That email belongs to a staff account — please use staff sign-in." },
                        status: :forbidden)
        end

        if user
          raw_token = MagicLinkToken.issue!(user)
          MagicLinkMailer.sign_in(user, raw_token).deliver_later
        end
        render json: { message: "If that email has an account, a sign-in link is on its way." }
      end

      # GET (clicked from the email). Single-use, short-lived — redirects to the
      # frontend callback with a real JWT, same pattern as the Google OAuth flow.
      def verify_magic_link
        token = MagicLinkToken.find_usable(params[:token])
        return redirect_with_magic_link_error("invalid_or_expired") unless token

        token.consume!
        redirect_to "#{frontend_url}/auth/callback?token=#{generate_token(token.user)}", allow_other_host: true
      end

      # Staff/admin password reset (customers are passwordless — nothing to
      # reset). Same enumeration-safe shape as request_magic_link: always
      # responds success, and a customer email is silently ignored rather than
      # 403ing, so this can't be used to probe which emails are staff either.
      def request_password_reset
        email = params[:email].to_s.downcase.strip
        user = User.find_by(email: email) if email.present?
        if user && !user.customer?
          raw_token = MagicLinkToken.issue!(user, purpose: "password_reset")
          MagicLinkMailer.password_reset(user, raw_token).deliver_later
        end
        render json: { message: "If that email has an account, a password reset link is on its way." }
      end

      # POST { token:, password: } — sets the new password directly (no
      # redirect; the frontend reset-password page calls this with the token
      # from the query string, matching the existing "forgot" form's shape).
      def reset_password
        token = MagicLinkToken.find_usable(params[:token], purpose: "password_reset")
        return render(json: { error: "That reset link is invalid or has expired." }, status: :unprocessable_entity) unless token

        user = token.user
        user.password = params[:password]
        user.save!
        token.consume!
        render json: { message: "Password updated. You can sign in now." }
      end

      # Change password for a LOGGED-IN staff/admin: verify the current password,
      # then set the new one. Distinct from reset_password (which uses an emailed
      # token for someone locked out). Customers are passwordless, so they can't
      # use this. The current session token stays valid - no forced re-login.
      def change_password
        user = current_user
        return render(json: { error: "Password changes aren't available for this account." }, status: :unprocessable_entity) if user.customer?

        unless params[:current_password].present? && user.authenticate(params[:current_password])
          return render json: { error: "Your current password is incorrect." }, status: :unauthorized
        end

        new_password = params[:new_password].to_s
        user.password = new_password
        if user.save
          render json: { message: "Password updated." }
        else
          render json: { error: user.errors.full_messages.to_sentence.presence || "Could not update the password." }, status: :unprocessable_entity
        end
      end

      # Staff & admin: dedicated endpoint, email + password (never email-only).
      def staff_login
        user = User.find_by(email: params[:email].to_s.downcase.strip)
        if user && !user.customer? && params[:password].present? && user.authenticate(params[:password])
          render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
        else
          render json: { error: "Invalid staff credentials" }, status: :unauthorized
        end
      end

      def me
        render json: UserSerializer.render_as_hash(current_user)
      end

      def update_me
        if params[:avatar].present? && !valid_image?(params[:avatar])
          return render json: { error: "Avatar must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        current_user.update!(update_params) if params[:user].present?
        current_user.avatar.attach(params[:avatar]) if params[:avatar].present?
        render json: UserSerializer.render_as_hash(current_user)
      end

      private

      # Passwordless customer sign-in: find-or-create by email, issue a token.
      def provision_customer(created:)
        src   = params[:user].presence || params
        email = src[:email].to_s.downcase.strip
        return render(json: { error: "Email is required" }, status: :unprocessable_entity) if email.blank?

        existing = User.find_by(email: email)
        # Staff/admin can't use the passwordless customer flow — send them to staff sign-in.
        if existing && !existing.customer?
          return render(json: { error: "That email belongs to a staff account — please use staff sign-in." },
                        status: :forbidden)
        end

        user = existing || User.new(email: email, role: :customer)
        if user.new_record? && params[:referral_code].present?
          user.referred_by = User.find_by(referral_code: params[:referral_code].to_s.upcase)
        end
        contact = src.permit(
          :first_name, :last_name, :phone, :marketing_opt_in, :avatar_url,
          :street_address, :city, :country, :postal_code, :special_needs
        ).to_h.compact_blank
        user.assign_attributes(contact) if contact.present?
        user.save!

        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) },
               status: (created && existing.nil? ? :created : :ok)
      end

      def update_params
        params.require(:user).permit(
          :first_name, :last_name, :phone, :marketing_opt_in, :avatar_url,
          :street_address, :city, :country, :postal_code, :special_needs
        )
      end

      def generate_token(user)
        payload = { sub: user.id, role: user.role, exp: 30.days.from_now.to_i }
        JWT.encode(payload, jwt_secret, "HS256")
      end

      def frontend_url
        ENV.fetch("APP_URL", "http://localhost:3001")
      end

      def redirect_with_magic_link_error(reason)
        redirect_to "#{frontend_url}/signin?error=#{reason}", allow_other_host: true
      end
    end
  end
end
