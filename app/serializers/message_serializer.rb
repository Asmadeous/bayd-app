class MessageSerializer < Blueprinter::Base
  identifier :id
  fields :conversation_id, :sender_id, :body, :read_at, :created_at
end
