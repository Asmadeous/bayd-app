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
            payload:            request.parsed_body || {},
            signature_verified: true
          )
          event.save!

          Traccar::WebhookProcessor.new(event.payload).call
          head :ok
        end

        private

        def verify_secret
          expected = ENV.fetch("TRACCAR_WEBHOOK_SECRET", "")
          provided = request.headers["X-Traccar-Secret"] || ""
          head :unauthorized unless ActiveSupport::SecurityUtils.secure_compare(expected, provided)
        end
      end
    end
  end
end
