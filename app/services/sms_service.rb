# Sends SMS via Twilio's REST API directly over Faraday — no SDK gem required.
# Silently no-ops when Twilio credentials are absent so notifications never fail
# in environments that haven't configured texting.
class SmsService
  def self.configured?
    ENV["TWILIO_ACCOUNT_SID"].present? &&
      ENV["TWILIO_AUTH_TOKEN"].present? &&
      ENV["TWILIO_FROM_NUMBER"].present?
  end

  def self.send_message(to:, body:)
    return { success: false, error: "not_configured" } unless configured?
    return { success: false, error: "no_recipient" } if to.blank?

    sid = ENV.fetch("TWILIO_ACCOUNT_SID")
    conn = Faraday.new("https://api.twilio.com") do |f|
      f.request :url_encoded
      f.response :json
      f.request :authorization, :basic, sid, ENV.fetch("TWILIO_AUTH_TOKEN")
    end

    response = conn.post("/2010-04-01/Accounts/#{sid}/Messages.json", {
      From: ENV.fetch("TWILIO_FROM_NUMBER"),
      To:   to,
      Body: body
    })

    if response.status.between?(200, 299)
      { success: true, sid: response.body["sid"] }
    else
      { success: false, error: response.body["message"] || "sms_failed" }
    end
  rescue Faraday::Error => e
    { success: false, error: e.message }
  end
end
