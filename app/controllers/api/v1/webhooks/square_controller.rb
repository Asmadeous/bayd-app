module Api
  module V1
    module Webhooks
      # Square payment webhook — authoritative confirmation for Square-gateway
      # online-shopping orders. Idempotent via sync_events.
      class SquareController < ApplicationController
        skip_before_action :authenticate_user!

        def receive
          raw = request.raw_post
          notification_url = ENV.fetch("SQUARE_WEBHOOK_NOTIFICATION_URL", request.original_url)
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
          ENV["SQUARE_WEBHOOK_SIGNATURE_KEY"].present?
        end
      end
    end
  end
end
