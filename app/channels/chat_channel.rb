# Live messages for a conversation. A client subscribes with a conversation_id;
# only a participant (or an admin) is allowed to stream it. New messages are
# broadcast to the conversation's stream so both participants receive them in
# real time — the same serialized shape the REST endpoint returns.
class ChatChannel < ApplicationCable::Channel
  def subscribed
    conversation = Conversation.find_by(id: params[:conversation_id])
    return reject unless conversation && (conversation.participant?(current_user) || current_user.admin?)

    @conversation = conversation
    stream_from stream_name(conversation)
    broadcast_presence(true) if Presence.connect(current_user.id)
  end

  def unsubscribed
    return unless current_user

    broadcast_presence(false) if Presence.disconnect(current_user.id)
  end

  # Relay a transient typing signal to the other participant. Not persisted.
  def typing(_data = {})
    broadcast_typing(true)
  end

  def stopped_typing(_data = {})
    broadcast_typing(false)
  end

  def self.broadcast_message(message)
    ActionCable.server.broadcast(
      stream_name(message.conversation),
      MessageSerializer.render_as_hash(message)
    )
  end

  # A read receipt: `reader` opened the conversation and read the other person's
  # messages. Carries a `type` so the client distinguishes it from a new message
  # (a raw message payload has no `type`).
  def self.broadcast_read(conversation, reader, at)
    ActionCable.server.broadcast(
      stream_name(conversation),
      { type: "read", conversation_id: conversation.id, reader_id: reader.id, at: at.iso8601 }
    )
  end

  def self.stream_name(conversation)
    "conversation:#{conversation.id}"
  end

  def stream_name(conversation)
    self.class.stream_name(conversation)
  end

  private

  def broadcast_typing(typing)
    return unless @conversation

    ActionCable.server.broadcast(
      stream_name(@conversation),
      { type: "typing", conversation_id: @conversation.id, user_id: current_user.id, typing: typing }
    )
  end

  # Tell everyone this user talks to that they came online / went offline. Sent to
  # each of the user's conversation streams so those partners' UIs update.
  def broadcast_presence(online)
    Conversation.for_user(current_user).find_each do |convo|
      ActionCable.server.broadcast(
        stream_name(convo),
        { type: "presence", user_id: current_user.id, online: online }
      )
    end
  end
end
