module Api
  module V1
    module Webhooks
      # Helcim payment webhook — authoritative confirmation for online-shopping
      # orders. Idempotent via sync_events.
      class HelcimController < ApplicationController
        skip_before_action :authenticate_user!

        def receive
          raw = request.raw_post
          verified = HelcimService.verify_webhook(
            raw,
            request.headers["webhook-signature"],
            webhook_id:        request.headers["webhook-id"],
            webhook_timestamp: request.headers["webhook-timestamp"]
          )
          return head :unauthorized if verifier_configured? && !verified

          body = request.parsed_body || {}
          ext  = body["id"]&.to_s

          event = SyncEvent.find_or_initialize_by(provider: "helcim", external_id: ext)
          return head :ok if event.persisted? && event.processed?

          event.update!(event_type: body["type"] || "transaction", payload: body, signature_verified: verified)
          PaymentWebhookProcessor.helcim(event)
          head :ok
        end

        private

        def verifier_configured?
          ENV["HELCIM_WEBHOOK_VERIFIER_TOKEN"].present?
        end
      end
    end
  end
end
