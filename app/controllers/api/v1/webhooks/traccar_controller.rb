module Api
  module V1
    module Webhooks
      class TraccarController < ApplicationController
        skip_before_action :authenticate_user!
        before_action :verify_secret

        def positions
          event = SyncEvent.find_or_initialize_by(
            provider:    "traccar",
            external_id: nil
          )
          event.assign_attributes(
            event_type:         "position",
            payload:            parsed_payload,
            signature_verified: true
          )
          event.save!

          Traccar::WebhookProcessor.new(event.payload).call
          head :ok
        end

        private

        # Parse the raw JSON body directly. request.parsed_body is NOT available
        # on ActionDispatch::Request in these API controllers (raises
        # NoMethodError → 500s the webhook), so read + parse the raw body.
        def parsed_payload
          raw = request.raw_post
          raw.present? ? (JSON.parse(raw) rescue {}) : {}
        end

        def verify_secret
          expected = ENV.fetch("TRACCAR_WEBHOOK_SECRET", "")
          provided = request.headers["X-Traccar-Secret"] || ""
          head :unauthorized unless ActiveSupport::SecurityUtils.secure_compare(expected, provided)
        end
      end
    end
  end
end
