module Api
  module V1
    module Webhooks
      class SimplybookController < ApplicationController
        skip_before_action :authenticate_user!
        before_action :verify_secret

        def receive
          body   = request.parsed_body || {}
          ext_id = body["notification_id"]&.to_s

          event = SyncEvent.find_or_initialize_by(provider: "simplybook", external_id: ext_id)
          return head :ok if event.persisted? && event.processed?

          event.update!(
            event_type:         body["event"] || "unknown",
            payload:            body,
            signature_verified: secret_configured?
          )

          SimplyBook::WebhookProcessor.new(event).call
          head :ok
        end

        private

        # SimplyBook signs each callback: sign = md5(booking_id + booking_hash + secret_key),
        # where secret_key is the "Secret key" from the API custom feature settings
        # (SIMPLYBOOK_WEBHOOK_SECRET). We recompute and compare — the secret is never
        # sent over the wire. When no secret is configured (e.g. local dev) we accept
        # and mark the event unverified.
        def verify_secret
          return unless secret_configured?

          body     = request.parsed_body || {}
          expected = Digest::MD5.hexdigest("#{body['booking_id']}#{body['booking_hash']}#{webhook_secret}")
          provided = (body["sign"] || body["signature"]).to_s
          head :unauthorized unless ActiveSupport::SecurityUtils.secure_compare(expected, provided)
        end

        def secret_configured?
          webhook_secret.present?
        end

        def webhook_secret
          ENV.fetch("SIMPLYBOOK_WEBHOOK_SECRET", "")
        end
      end
    end
  end
end
