module Api
  module V1
    # Google OAuth 2.0 **authorization-code** flow (backend-redirect variant):
    #   GET  /auth/google           → 302 to Google's consent screen
    #   GET  /auth/google/callback  → Google 302s here with ?code=…; we exchange
    #                                 code + client_secret for tokens at Google,
    #                                 verify the id_token, find/create the user,
    #                                 then 302 back to the frontend with our JWT.
    #
    # Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (the exact
    # callback URL registered in Google Console), and APP_URL (frontend to return to).
    class GoogleAuthController < ApplicationController
      skip_before_action :authenticate_user!

      AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth".freeze
      TOKEN_URL = "https://oauth2.googleapis.com/token".freeze

      # Step 1 — send the browser to Google. `state` is a signed anti-CSRF nonce.
      def start
        state = SecureRandom.hex(24)
        cookies.encrypted[:google_oauth_state] = { value: state, httponly: true, same_site: :lax, expires: 10.minutes }

        query = {
          client_id:     ENV.fetch("GOOGLE_CLIENT_ID", ""),
          redirect_uri:  redirect_uri,
          response_type: "code",
          scope:         "openid email profile",
          state:         state,
          access_type:   "online",
          prompt:        "select_account"
        }
        redirect_to "#{AUTH_URL}?#{query.to_query}", allow_other_host: true
      end

      # Step 2 — Google redirected back with ?code=… (or ?error=…).
      def callback
        return redirect_with_error("google_denied") if params[:error].present?
        return redirect_with_error("state_mismatch") unless valid_state?

        tokens = exchange_code(params[:code])
        return redirect_with_error("token_exchange_failed") unless tokens

        data = verify_id_token(tokens["id_token"])
        return redirect_with_error("invalid_token") unless data

        user = find_or_create_from_google(data)
        redirect_to "#{frontend_url}/auth/callback?token=#{generate_token(user)}", allow_other_host: true
      ensure
        cookies.delete(:google_oauth_state)
      end

      private

      def valid_state?
        expected = cookies.encrypted[:google_oauth_state].to_s
        provided = params[:state].to_s
        expected.present? && ActiveSupport::SecurityUtils.secure_compare(expected, provided)
      end

      # Exchange the auth code for tokens. Returns the token hash or nil.
      def exchange_code(code)
        return nil if code.blank?

        conn = Faraday.new(TOKEN_URL) { |f| f.request :url_encoded; f.response :json; f.adapter Faraday.default_adapter }
        resp = conn.post("", {
          code:          code,
          client_id:     ENV.fetch("GOOGLE_CLIENT_ID", ""),
          client_secret: ENV.fetch("GOOGLE_CLIENT_SECRET", ""),
          redirect_uri:  redirect_uri,
          grant_type:    "authorization_code"
        })
        resp.success? ? resp.body : nil
      rescue StandardError
        nil
      end

      # Verify the id_token via Google's tokeninfo endpoint and confirm it was
      # issued for our client and email is verified. Returns payload or nil.
      def verify_id_token(id_token)
        return nil if id_token.blank?

        conn = Faraday.new("https://oauth2.googleapis.com/tokeninfo") { |f| f.response :json; f.adapter Faraday.default_adapter }
        resp = conn.get("", id_token: id_token)
        return nil unless resp.success?

        data = resp.body
        return nil unless Array(data["aud"]).include?(ENV.fetch("GOOGLE_CLIENT_ID", ""))
        return nil unless %w[accounts.google.com https://accounts.google.com].include?(data["iss"])
        return nil unless ActiveModel::Type::Boolean.new.cast(data["email_verified"])

        data
      rescue StandardError
        nil
      end

      def find_or_create_from_google(data)
        google_uid = data["sub"]
        email      = data["email"]&.downcase

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
        JWT.encode(payload, jwt_secret, "HS256")
      end

      def redirect_uri
        ENV.fetch("GOOGLE_REDIRECT_URI", "#{request.base_url}/api/v1/auth/google/callback")
      end

      def frontend_url
        ENV.fetch("APP_URL", "http://localhost:3001")
      end

      def redirect_with_error(reason)
        redirect_to "#{frontend_url}/login?error=#{reason}", allow_other_host: true
      end
    end
  end
end
