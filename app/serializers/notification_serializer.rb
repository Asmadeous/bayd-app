class NotificationSerializer < Blueprinter::Base
  identifier :id
  fields :kind, :title, :body, :action_url, :read_at, :created_at, :metadata
end
