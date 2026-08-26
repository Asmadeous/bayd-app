class ConversationSerializer < Blueprinter::Base
  identifier :id
  fields :last_message_at, :created_at

  # The person the viewer is talking to, and the viewer's unread count — both
  # relative to `options[:current_user]` (pass it when rendering).
  field :other_participant do |conversation, options|
    other = options[:current_user] ? conversation.other_participant(options[:current_user]) : nil
    other && { id: other.id, first_name: other.first_name, last_name: other.last_name, role: other.role }
  end

  field :unread_count do |conversation, options|
    options[:current_user] ? conversation.unread_count_for(options[:current_user]) : 0
  end
end
