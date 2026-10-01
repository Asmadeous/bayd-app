class MeetingSerializer < Blueprinter::Base
  identifier :id
  fields :room_name, :provider, :status, :scheduled_at, :started_at, :ended_at, :booking_id, :join_opens_at

  field :url do |meeting|
    meeting.url
  end
end
