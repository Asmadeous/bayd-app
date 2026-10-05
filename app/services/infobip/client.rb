module Infobip
  # The ONE external call for SMS: sends a single text via the Infobip SMS API.
  # Contract verified against Infobip docs (POST {base}/sms/3/messages):
  #   Authorization: App <API_KEY>
  #   { "messages": [{ "sender", "destinations": [{ "to" }], "content": { "text" } }] }
  #
  # Configured via ENV (never .env in code): INFOBIP_BASE_URL (the account's
  # personalized host, e.g. https://xxxxx.api.infobip.com), INFOBIP_API_KEY, and
  # INFOBIP_SENDER. Unconfigured -> #configured? false and callers skip sending.
  # Returns :ok or :error.
  class Client
    def configured?
      base_url.present? && api_key.present? && sender.present?
    end

    def send_sms(to:, text:)
      return :skipped unless configured?

      resp = connection.post("/sms/3/messages") do |req|
        req.headers["Authorization"] = "App #{api_key}"
        req.headers["Content-Type"]  = "application/json"
        req.body = {
          messages: [
            { sender: sender, destinations: [ { to: to } ], content: { text: text } }
          ]
        }.to_json
      end
      resp.success? ? :ok : :error
    rescue StandardError => e
      Rails.logger.warn("[Infobip::Client] send failed: #{e.message}")
      :error
    end

    private

    def connection
      @connection ||= Faraday.new(url: base_url)
    end

    def base_url = ENV["INFOBIP_BASE_URL"].presence
    def api_key  = ENV["INFOBIP_API_KEY"].presence
    def sender   = ENV["INFOBIP_SENDER"].presence
  end
end
