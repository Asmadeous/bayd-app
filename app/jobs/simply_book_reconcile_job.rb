# Keeps our DB and SimplyBook in agreement, both directions:
#   • inbound  — pull recent SimplyBook bookings and mirror them locally
#                (catches app-channel bookings + any missed webhooks)
#   • outbound — push local bookings that never reached SimplyBook
#
# Idempotent and safe to run on a schedule. No-ops cleanly when SimplyBook
# credentials aren't configured yet.
class SimplyBookReconcileJob < ApplicationJob
  queue_as :low

  def perform(days_back: 7, days_forward: 60)
    return if ENV["SIMPLYBOOK_COMPANY"].blank?

    client = SimplyBook::Client.new
    pull_inbound(client, days_back, days_forward)
    push_outbound(client)
  rescue StandardError => e
    Rails.logger.error("[SimplyBookReconcileJob] #{e.class}: #{e.message}")
  end

  private

  def pull_inbound(client, days_back, days_forward)
    list = client.bookings(date_from: Date.current - days_back, date_to: Date.current + days_forward)
    Array(list).each do |detail|
      SimplyBook::BookingMirror.upsert(detail)
    rescue StandardError => e
      Rails.logger.warn("[SimplyBookReconcileJob] inbound upsert failed: #{e.message}")
    end
  end

  def push_outbound(client)
    Booking.needs_simplybook_sync.includes(:service, :employee_profile, :user).find_each do |booking|
      next if booking.service&.simplybook_event_id.blank? || booking.employee_profile&.simplybook_unit_id.blank?

      sid = client.create_booking(
        service_id: booking.service.simplybook_event_id,
        unit_id:    booking.employee_profile.simplybook_unit_id,
        starts_at:  booking.starts_at,
        client: {
          name:  [ booking.user.first_name, booking.user.last_name ].compact.join(" ").strip.presence || booking.user.email,
          email: booking.user.email,
          phone: booking.user.phone
        }
      )
      booking.update_columns(simplybook_id: sid, synced_at: Time.current) if sid.present?
    rescue StandardError => e
      Rails.logger.warn("[SimplyBookReconcileJob] outbound push failed for booking #{booking.id}: #{e.message}")
    end
  end
end
