require "googleauth"
require "stringio"
require "base64"

module Fcm
  # The ONE external call in the push stack: sends a single message to one device
  # token via the FCM HTTP v1 API. Everything else (device tokens, when to push)
  # is plain Rails; this is the unavoidable hop to Google's gateway.
  #
  #   POST https://fcm.googleapis.com/v1/projects/{project}/messages:send
  #   Authorization: Bearer <oauth2 from the service account>
  #   { "message": { "token": ..., "notification": { title, body }, "data": {...} } }
  #
  # Configured via ENV (never .env in code): FCM_PROJECT_ID + FCM_CREDENTIALS_JSON
  # (the service-account key JSON). Unconfigured → #configured? is false and callers
  # skip sending. Returns :ok, :unregistered (caller should prune the token), or
  # :error.
  class Client
    SCOPE    = "https://www.googleapis.com/auth/firebase.messaging".freeze
    BASE_URL = "https://fcm.googleapis.com".freeze

    def configured?
      project_id.present? && credentials_json.present?
    end

    def send_to(token:, title:, body:, data: {})
      return :skipped unless configured?

      resp = connection.post("/v1/projects/#{project_id}/messages:send") do |req|
        req.headers["Authorization"] = "Bearer #{access_token}"
        req.headers["Content-Type"]  = "application/json"
        req.body = message_body(token, title, body, data).to_json
      end
      return :ok if resp.success?

      unregistered?(resp) ? :unregistered : :error
    rescue StandardError => e
      Rails.logger.warn("[Fcm::Client] send failed: #{e.message}")
      :error
    end

    private

    def message_body(token, title, body, data)
      {
        message: {
          token: token,
          notification: { title: title, body: body }.compact,
          # FCM data values must be strings.
          data: data.transform_values(&:to_s)
        }.compact
      }
    end

    # A 404 with UNREGISTERED / NOT_FOUND means the token is dead — the caller
    # deletes it so we stop sending to it.
    def unregistered?(resp)
      return true if resp.status == 404

      err = (JSON.parse(resp.body)["error"] rescue nil) || {}
      code = err.dig("details", 0, "errorCode") || err["status"]
      %w[UNREGISTERED NOT_FOUND].include?(code)
    end

    def access_token
      authorizer = Google::Auth::ServiceAccountCredentials.make_creds(
        json_key_io: StringIO.new(credentials_json), scope: SCOPE
      )
      authorizer.fetch_access_token!["access_token"]
    end

    def connection
      @connection ||= Faraday.new(url: BASE_URL)
    end

    def project_id = ENV["FCM_PROJECT_ID"].presence

    # The service-account key JSON. Raw multi-line JSON does not survive a secret
    # store / env var cleanly - the newlines inside private_key get mangled and
    # make_creds fails with "expected object key, got '\n'". So accept base64 too
    # (single line, pipeline-safe) and decode it: if the value doesn't look like
    # JSON, treat it as base64. Backward compatible with a raw-JSON secret.
    def credentials_json
      raw = ENV["FCM_CREDENTIALS_JSON"].presence
      return nil unless raw

      raw.strip.start_with?("{") ? raw : Base64.decode64(raw)
    end
  end
end
