class AdminSupportThreadSerializer < Blueprinter::Base
  identifier :id
  fields :name, :email, :status, :user_id, :last_message_at, :created_at

  field :unread_count do |thread|
    thread.unread_for_staff
  end

  field :last_message do |thread|
    thread.messages.last&.body&.truncate(120)
  end

  view :with_messages do
    field :messages do |thread|
      SupportMessageSerializer.render_as_hash(thread.messages.includes(:sender))
    end
  end
end
