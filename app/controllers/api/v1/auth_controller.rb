module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[register login]

      def register
        user = User.new(register_params)
        if params[:referral_code].present?
          user.referred_by = User.find_by(referral_code: params[:referral_code].to_s.upcase)
        end
        user.save!
        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }, status: :created
      end

      def login
        user = User.find_by(email: params[:email]&.downcase)
        if user&.authenticate(params[:password])
          render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
        else
          render json: { error: "Invalid credentials" }, status: :unauthorized
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

      def register_params
        params.require(:user).permit(
          :email, :password, :first_name, :last_name, :phone, :marketing_opt_in, :avatar_url,
          :street_address, :city, :country, :postal_code, :special_needs
        )
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
