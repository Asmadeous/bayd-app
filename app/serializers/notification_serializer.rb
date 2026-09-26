class NotificationSerializer < Blueprinter::Base
  identifier :id
  fields :kind, :title, :body, :action_url, :booking_id, :read_at, :created_at, :metadata
end
