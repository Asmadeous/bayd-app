module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[register login staff_login]

      # Customers: passwordless, email-keyed. register == login (find-or-create).
      def register
        provision_customer(created: true)
      end

      def login
        provision_customer(created: false)
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
    end
  end
end
