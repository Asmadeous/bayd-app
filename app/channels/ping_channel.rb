# Trivial channel that proves the ActionCable pipe works end-to-end: a connected
# client subscribes and can round-trip a message (echoed back with the server
# time). Not a product feature — chat lives in ChatChannel (2b).
class PingChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
  end

  def ping(data)
    PingChannel.broadcast_to(current_user, { echo: data["message"], at: Time.current.iso8601 })
  end
end
