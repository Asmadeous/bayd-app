# Live messages for a conversation. A client subscribes with a conversation_id;
# only a participant (or an admin) is allowed to stream it. New messages are
# broadcast to the conversation's stream so both participants receive them in
# real time — the same serialized shape the REST endpoint returns.
class ChatChannel < ApplicationCable::Channel
  def subscribed
    conversation = Conversation.find_by(id: params[:conversation_id])
    return reject unless conversation && (conversation.participant?(current_user) || current_user.admin?)

    stream_from stream_name(conversation)
  end

  def self.broadcast_message(message)
    ActionCable.server.broadcast(
      stream_name(message.conversation),
      MessageSerializer.render_as_hash(message)
    )
  end

  def self.stream_name(conversation)
    "conversation:#{conversation.id}"
  end

  def stream_name(conversation)
    self.class.stream_name(conversation)
  end
end
