module Api
  module V1
    module Webhooks
      # Square payment webhook — authoritative confirmation for Square-gateway
      # online-shopping orders. Idempotent via sync_events.
      class SquareController < ApplicationController
        include WebhookFranchise

        def receive
          raw = request.raw_post
          notification_url = Current.franchise.is_default ? ENV.fetch("SQUARE_WEBHOOK_NOTIFICATION_URL", request.original_url) : request.original_url
          verified = SquareService.verify_webhook(raw, request.headers["x-square-hmacsha256-signature"], notification_url)
          return head :unauthorized if signature_configured? && !verified

          # Parse the raw JSON body directly. request.parsed_body is NOT available
          # on ActionDispatch::Request in these API controllers (raises
          # NoMethodError → 500s the webhook), so parse the raw_post we already
          # read for signature verification.
          body = parse_json(raw)
          ext  = body["event_id"]&.to_s

          event = SyncEvent.find_or_initialize_by(provider: "square", external_id: ext)
          return head :ok if event.persisted? && event.processed?

          event.update!(event_type: body["type"] || "event", payload: body, signature_verified: verified)
          PaymentWebhookProcessor.square(event)
          head :ok
        end

        private

        def parse_json(raw)
          raw.present? ? (JSON.parse(raw) rescue {}) : {}
        end

        def signature_configured?
          SquareService.credential("webhook_signature_key").present?
        end
      end
    end
  end
end
