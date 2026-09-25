# Pushes a new chat message to the other participant's phone. Push only: chat is
# too chatty for SMS or the in-app notifications list. `path` tells the app which
# screen to open when the notification is tapped (customer and staff apps have
# their own thread screens). Best-effort, like every push.
class ChatMessagePushJob < ApplicationJob
  queue_as :default

  def perform(message_id)
    message = Message.includes(:sender, :conversation).find_by(id: message_id)
    return unless message

    recipient = message.conversation.other_participant(message.sender)
    return unless recipient

    PushService.push(
      user: recipient,
      title: "New message from #{message.sender.first_name.presence || 'Beauty @ Your Door'}",
      body: message.body.truncate(140),
      data: { kind: "chat_message", conversation_id: message.conversation_id, path: thread_path(recipient, message.conversation_id) }
    )
  end

  private

  def thread_path(user, conversation_id)
    base = user.customer? ? "/app/messages/thread" : "/staff/messages/thread"
    "#{base}?id=#{conversation_id}"
  end
end
