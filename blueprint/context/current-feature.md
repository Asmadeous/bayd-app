# Feature: 2c - Presence, typing indicators, read receipts

**From build-plan:** feature 2c (under 2. Chat + push backend)
**Status:** not started

## Goal

Round out live chat with the three signals users expect: who's online
(presence), who's typing right now, and whether their message was read. All pure
Rails/ActionCable over the 2a pipe — no external services.

## In scope

- **Read receipts:** mark the OTHER participant's messages read when you open a
  conversation; `read_at` stamped; broadcast a `read` event so the sender's UI
  updates live. `POST /conversations/:id/read`.
- **Typing indicators:** a client sends `typing`/`stopped_typing` on `ChatChannel`;
  it's relayed to the other participant (not persisted).
- **Presence:** track which users are currently connected; broadcast
  online/offline transitions to their conversation partners. Presence is
  in-memory/cache (Solid Cache), not a DB table — it's ephemeral connection state.

## Out of scope (deferred)

- Per-message delivery receipts (only read + typing here).
- Presence history / "last seen" timestamps persisted to the DB.
- Group presence (1:1 only, matching 2b).

## Build loop

One step at a time: diff, explain, verify, optional checkpoint, next.

## Build steps

- [ ] **Step 1 - Read receipts** — `Conversation#mark_read_by!(user)` stamps
      `read_at` on the other participant's unread messages; `POST
      /conversations/:id/read` calls it and broadcasts a `{ type: "read",
      conversation_id:, reader_id:, at: }` event to the conversation stream.
      *Done when:* opening marks unread messages read; the sender gets a live read
      event; a non-participant is forbidden; specs green.
- [ ] **Step 2 - Typing indicators** — `ChatChannel#typing` / `#stopped_typing`
      receive actions relay `{ type: "typing", conversation_id:, user_id:, typing:
      bool }` to the OTHER participant's view of the stream (ephemeral, not saved).
      *Done when:* a channel spec triggers `typing` and asserts the broadcast; not
      persisted.
- [ ] **Step 3 - Presence** — a `Presence` service backed by Solid Cache tracks
      connected user ids (marked on `ChatChannel#subscribed`, cleared on
      `#unsubscribed`); on transition, broadcast `{ type: "presence", user_id:,
      online: bool }` to that user's conversation partners. *Done when:*
      subscribing marks a user online and unsubscribing marks them offline; a spec
      asserts the presence state + broadcast.

## Files / areas

- `app/models/conversation.rb` (`mark_read_by!`)
- `app/controllers/api/v1/reads_controller.rb` or a `read` action on messages/conversations
- `app/channels/chat_channel.rb` (typing actions, presence on sub/unsub)
- `app/services/presence.rb` (Solid Cache-backed online set)
- `config/routes.rb`
- Specs: `spec/models/`, `spec/requests/`, `spec/channels/`, `spec/services/`

## Data / contracts

**Broadcast event shapes** (all on the `"conversation:#{id}"` stream, discriminated
by `type`, matching how 2b broadcasts a raw message):
- read:     `{ type: "read", conversation_id:, reader_id:, at: }`
- typing:   `{ type: "typing", conversation_id:, user_id:, typing: bool }`
- presence: `{ type: "presence", user_id:, online: bool }`

> Note: 2b broadcasts a bare `MessageSerializer` hash (no `type`). Keep that as-is
> for new messages; the client treats a payload with no `type` as a new message
> and one with a `type` as an event. (Documented here so the client contract is
> explicit.)

**Presence store:** Solid Cache key per online user (e.g. `presence:user:<id>`)
with a short TTL refreshed on activity; no DB table.

## Testing

`bundle exec rspec` is the gate.

- **Read:** `mark_read_by!` stamps only the other person's unread messages;
  endpoint forbids non-participants; broadcasts a read event.
- **Typing:** channel `typing` action broadcasts the typing event; nothing
  persisted.
- **Presence:** subscribe marks online, unsubscribe marks offline; `Presence.online?`
  reflects it; transition broadcasts.
- `bin/rubocop` + `bin/brakeman` clean.

## Notes for the AI

- Reuse the 2b `"conversation:#{id}"` stream + `ChatChannel`. Presence/typing are
  relayed, read is persisted (`read_at`) AND broadcast.
- Presence is ephemeral — Solid Cache, not a DB table. Don't add a migration for it.
- Broadcasts carry a `type` to disambiguate from a new-message payload (which has
  none). Keep 2b's message broadcast unchanged.
- Best-effort broadcasts: a presence/typing failure must never break a message
  send or the connection.
- Scope everything to conversation participants; reuse the existing auth.
