# Tracks which users are currently connected, for chat online/offline status.
# Presence is EPHEMERAL connection state, so it lives in the cache (Solid Cache in
# production, Postgres-backed) with a short TTL refreshed while connected — never
# a DB table. A user may have several open connections (tabs, phone + web), so we
# ref-count: online while at least one connection is open.
module Presence
  TTL = 1.hour # safety net so a dropped connection can't pin someone "online" forever

  module_function

  def key(user_id) = "presence:user:#{user_id}"

  # Returns true only on the 0 -> 1 transition (the caller broadcasts "came online").
  def connect(user_id)
    count = (Rails.cache.read(key(user_id)) || 0) + 1
    Rails.cache.write(key(user_id), count, expires_in: TTL)
    count == 1
  end

  # Returns true only on the 1 -> 0 transition (the caller broadcasts "went offline").
  def disconnect(user_id)
    count = (Rails.cache.read(key(user_id)) || 0) - 1
    if count <= 0
      Rails.cache.delete(key(user_id))
      true
    else
      Rails.cache.write(key(user_id), count, expires_in: TTL)
      false
    end
  end

  def online?(user_id)
    (Rails.cache.read(key(user_id)) || 0).positive?
  end
end
