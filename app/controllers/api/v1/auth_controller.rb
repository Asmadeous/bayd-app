module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[
        register login staff_login request_magic_link verify_magic_link
      ]

      # Customers: passwordless, email-keyed. register == login (find-or-create).
      def register
        provision_customer(created: true)
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
        current_user.update!(update_params)
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
