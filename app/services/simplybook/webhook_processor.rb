module SimplyBook
  # Turns a SimplyBook webhook notification into a local mirror update.
  # SimplyBook v2 webhooks are thin (notification_id + event + booking_id), so we
  # fetch the full booking and upsert it via BookingMirror.
  class WebhookProcessor
    CANCEL_EVENTS = %w[cancel canceled cancelled booking.cancelled].freeze

    def initialize(sync_event)
      @event = sync_event
    end

    def call
      booking_id = @event.payload["booking_id"]&.to_s

      if booking_id.present?
        if cancel_event?
          SimplyBook::BookingMirror.cancel(booking_id)
        else
          detail = SimplyBook::Client.new.get_booking(booking_id)
          SimplyBook::BookingMirror.upsert(detail) if detail
        end
      end

      @event.mark_processed!
    rescue StandardError => e
      # Leave unprocessed so the reconciliation job can retry later.
      Rails.logger.error("[SimplyBook::WebhookProcessor] #{e.class}: #{e.message}")
    end

    private

    def cancel_event?
      CANCEL_EVENTS.include?(@event.event_type.to_s.downcase)
    end
  end
end
