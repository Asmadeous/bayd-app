# Tells admins a website visitor wrote in the support chat. Only the first
# message of a thread, or the first reply after staff answered, notifies - a
# visitor typing several lines in a row doesn't page every admin for each one.
# Best-effort: a failure is logged, never raised.
class SupportMessageNotifyJob < ApplicationJob
  queue_as :default

  def perform(message_id)
    message = SupportMessage.includes(:support_thread).find_by(id: message_id)
    return unless message && !message.from_staff
    return unless starts_a_turn?(message)

    thread = message.support_thread
    User.where(role: :admin).find_each do |admin|
      NotificationService.deliver(
        user: admin, kind: :support_message,
        title: "New support chat message",
        body: "#{thread.name}: #{message.body.truncate(140)}",
        action_url: "#{app_url}/dashboard/admin/support?thread=#{thread.id}",
        metadata: { support_thread_id: thread.id, cta: "Open chat" }
      )
    end
  rescue StandardError => e
    Rails.logger.warn("[SupportMessageNotifyJob] message #{message_id} failed: #{e.message}")
  end

  private

  def starts_a_turn?(message)
    previous = message.support_thread.messages.where("created_at < ?", message.created_at).last
    previous.nil? || previous.from_staff
  end

  def app_url = ENV.fetch("APP_URL", "http://localhost:3001")
end
