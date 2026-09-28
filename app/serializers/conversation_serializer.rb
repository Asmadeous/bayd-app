class ConversationSerializer < Blueprinter::Base
  identifier :id
  fields :last_message_at, :created_at

  # The person the viewer is talking to, and the viewer's unread count — both
  # relative to `options[:current_user]` (pass it when rendering).
  field :other_participant do |conversation, options|
    other = options[:current_user] ? conversation.other_participant(options[:current_user]) : nil
    other && { id: other.id, first_name: other.first_name, last_name: other.last_name, role: other.role,
               avatar_url: other.display_photo_url }
  end

  field :unread_count do |conversation, options|
    options[:current_user] ? conversation.unread_count_for(options[:current_user]) : 0
  end

  # Block state from the viewer's side, so the thread can say why it can't send.
  field :blocked_by_me do |conversation, options|
    viewer = options[:current_user]
    viewer ? UserBlock.exists?(blocker: viewer, blocked: conversation.other_participant(viewer)) : false
  end

  field :blocked_me do |conversation, options|
    viewer = options[:current_user]
    viewer ? UserBlock.exists?(blocker: conversation.other_participant(viewer), blocked: viewer) : false
  end
end
