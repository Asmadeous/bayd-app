module Api
  module V1
    class GoogleAuthController < ApplicationController
      skip_before_action :authenticate_user!

      GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

      def callback
        data = verify_google_token(params[:id_token])
        return render json: { error: "Invalid Google token" }, status: :unauthorized unless data

        user = find_or_create_from_google(data)
        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
      end

      private

      # Verifies the Google ID token by calling Google's tokeninfo endpoint.
      # Returns the decoded payload hash or nil on any failure.
      def verify_google_token(id_token)
        return nil if id_token.blank?

        conn = Faraday.new(GOOGLE_TOKEN_INFO_URL) { |f| f.response :json; f.adapter Faraday.default_adapter }
        resp = conn.get("", id_token: id_token)
        return nil unless resp.success?

        data = resp.body
        # Ensure the token was issued for our app
        return nil unless Array(data["aud"]).include?(ENV.fetch("GOOGLE_CLIENT_ID", ""))

        data
      rescue StandardError
        nil
      end

      def find_or_create_from_google(data)
        google_uid = data["sub"]
        email      = data["email"]&.downcase

        # Prefer lookup by Google UID, fall back to email (links existing account)
        user = User.find_by(google_uid: google_uid) || User.find_by(email: email)

        if user
          user.update!(google_uid: google_uid) if user.google_uid.blank?
        else
          user = User.create!(
            email:      email,
            first_name: data["given_name"],
            last_name:  data["family_name"],
            google_uid: google_uid,
            role:       :customer
          )
        end

        user
      end

      def generate_token(user)
        payload = { sub: user.id, role: user.role, exp: 30.days.from_now.to_i }
        JWT.encode(payload, Rails.application.credentials.secret_key_base || ENV.fetch("SECRET_KEY_BASE"), "HS256")
      end
    end
  end
end
