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

        # If a webhook secret is configured, require it (header or ?secret=).
        # When unset (e.g. local dev) we accept and mark the event unverified.
        def verify_secret
          return unless secret_configured?

          provided = request.headers["X-Simplybook-Secret"] || params[:secret].to_s
          head :unauthorized unless ActiveSupport::SecurityUtils.secure_compare(webhook_secret, provided)
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
