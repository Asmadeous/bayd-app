# A short video call between the customer and the assigned technician to confirm
# the scope of work before service. Uses Jitsi Meet (open-source, no API key) —
# the room is just a hard-to-guess URL shared with both parties.
class Meeting < ApplicationRecord
  belongs_to :booking

  enum :status, { scheduled: "scheduled", completed: "completed", cancelled: "cancelled" }, prefix: true

  before_validation :assign_defaults, on: :create
  validates :room_name, presence: true, uniqueness: true
  validates :provider, presence: true

  after_create_commit :notify_participants
  after_create_commit :schedule_reminders

  def url
    "https://#{ENV.fetch('JITSI_HOST', 'meet.jit.si')}/#{room_name}"
  end

  def complete!
    update!(status: "completed", ended_at: Time.current)
  end

  def cancel!
    update!(status: "cancelled", ended_at: Time.current)
  end

  private

  def assign_defaults
    self.room_name  ||= "bayd-#{SecureRandom.uuid}"
    self.provider   ||= "jitsi"
    self.scheduled_at ||= booking&.starts_at || Time.current
  end

  def notify_participants
    [ booking.user, booking.employee_profile&.user ].compact.uniq.each do |user|
      NotificationService.deliver(
        user: user,
        kind: :meeting_scheduled,
        title: "Work-scope video call scheduled",
        body: "Join the video call to confirm the details of your appointment before service.",
        booking: booking,
        action_url: url
      )
    end
  end

  # Best-effort: a scheduling failure must never break meeting creation.
  def schedule_reminders
    MeetingReminders.schedule(self)
  rescue StandardError => e
    Rails.logger.warn("[Meeting##{id}] reminder scheduling failed: #{e.message}")
  end
end
