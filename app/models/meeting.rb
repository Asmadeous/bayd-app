# A short video call between the customer and the assigned technician to confirm
# the scope of work before service. Uses Jitsi Meet (open-source, no API key) —
# the room is just a hard-to-guess URL shared with both parties.
class Meeting < ApplicationRecord
  include FranchiseScoped

  # The call is set for a time both people know: the room opens JOIN_LEAD_MIN
  # before it, so neither sits in an empty room waiting for the other.
  JOIN_LEAD_MIN = 10

  belongs_to :booking

  enum :status, { scheduled: "scheduled", completed: "completed", cancelled: "cancelled" }, prefix: true

  before_validation :assign_defaults, on: :create
  validates :room_name, presence: true, uniqueness: true
  validates :provider, presence: true
  validate  :scheduled_at_sensible, if: :will_save_change_to_scheduled_at?

  after_create_commit -> { notify_participants }
  after_create_commit :schedule_reminders

  def url
    "https://#{ENV.fetch('JITSI_HOST', 'meet.jit.si')}/#{room_name}"
  end

  def join_opens_at = scheduled_at && scheduled_at - JOIN_LEAD_MIN.minutes

  # Move the call: new reminders for the new time, and both people are told.
  def reschedule!(at)
    update!(scheduled_at: at)
    begin
      MeetingReminders.schedule(self)
      notify_participants(changed: true)
    rescue StandardError => e
      Rails.logger.warn("[Meeting##{id}] reschedule notices failed: #{e.message}")
    end
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

  def notify_participants(changed: false)
    when_local = scheduled_at.in_time_zone(BusinessHours.zone).strftime("%a, %b %-d at %-l:%M %p")
    [ booking.user, booking.employee_profile&.user ].compact.uniq.each do |user|
      NotificationService.deliver(
        user: user,
        kind: :meeting_scheduled,
        title: changed ? "Video call moved to #{when_local}" : "Video call set for #{when_local}",
        body: "A short work-scope call to confirm the details of your appointment. " \
              "Join from the booking up to #{JOIN_LEAD_MIN} minutes before.",
        booking: booking,
        action_url: url,
        metadata: { scheduled_at: scheduled_at.iso8601 }
      )
    end
  end

  # A call is for before (or at) the visit, and not in the past. A few minutes'
  # slack lets "call now" through while the request travels.
  def scheduled_at_sensible
    return if scheduled_at.nil?

    errors.add(:scheduled_at, "can't be in the past") if scheduled_at < 5.minutes.ago
    return unless booking&.ends_at

    errors.add(:scheduled_at, "must be before the appointment ends") if scheduled_at > booking.ends_at
  end

  # Best-effort: a scheduling failure must never break meeting creation.
  def schedule_reminders
    MeetingReminders.schedule(self)
  rescue StandardError => e
    Rails.logger.warn("[Meeting##{id}] reminder scheduling failed: #{e.message}")
  end
end
