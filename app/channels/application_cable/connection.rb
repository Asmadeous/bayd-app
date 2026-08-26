module ApplicationCable
  # Authenticates the WebSocket handshake with the SAME JWT as the HTTP API
  # (ApplicationController#authenticate_user!): HS256, secret = SECRET_KEY_BASE,
  # user = User.find(payload["sub"]).
  #
  # A browser WebSocket can't send an Authorization header on the handshake, so
  # the token comes as a query param: wss://.../cable?token=<jwt>. It's validated
  # exactly the same way regardless.
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = request.params[:token].presence || request.headers["Authorization"]&.split(" ")&.last
      reject_unauthorized_connection unless token

      payload = JWT.decode(token, jwt_secret, true, algorithm: "HS256").first
      User.find(payload["sub"])
    rescue JWT::DecodeError, ActiveRecord::RecordNotFound
      reject_unauthorized_connection
    end

    def jwt_secret
      ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base
    end
  end
end
