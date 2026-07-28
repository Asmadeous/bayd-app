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

          body = request.parsed_body || {}
          ext  = body["event_id"]&.to_s

          event = SyncEvent.find_or_initialize_by(provider: "square", external_id: ext)
          return head :ok if event.persisted? && event.processed?

          event.update!(event_type: body["type"] || "event", payload: body, signature_verified: verified)
          PaymentWebhookProcessor.square(event)
          head :ok
        end

        private

        def signature_configured?
          ENV["SQUARE_WEBHOOK_SIGNATURE_KEY"].present?
        end
      end
    end
  end
end
