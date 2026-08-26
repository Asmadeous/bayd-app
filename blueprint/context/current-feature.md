# Feature: 2b - Chat (conversations + messages + live broadcast)

**From build-plan:** feature 2b (under 2. Chat + push backend)
**Status:** not started

## Goal

Direct messaging between a customer and staff, and between staff and admin:
persistent `Conversation` + `Message` models, REST endpoints to list conversations
and read/post messages, and a `ChatChannel` that broadcasts new messages live over
the 2a ActionCable pipe. Authorization is strict — you only see conversations
you're a participant in; admins see all.

## In scope

- `Conversation` (two participants) + `Message` (sender, body, read state).
- REST: list my conversations; open/create a conversation with another user; list
  a conversation's messages (paginated); post a message.
- `ChatChannel` — subscribe to a conversation you're a participant in; a new
  message broadcasts to both participants live.
- Authorization: participant-only access; admin can see any conversation.
- Serializers + specs (models, requests, channel).

## Out of scope (deferred)

- **2c** — presence, typing indicators, read receipts over the wire.
- **2d** — FCM push (a push on a new message while offline).
- Group chats (only 1:1 for now).
- Attachments/images (text only).
- Client/mobile UI (Phases 3-4).

## Build loop

One step at a time: diff, explain, verify, optional checkpoint, next.

## Build steps

- [ ] **Step 1 - Conversation + Message models + migrations** — `conversations`
      (participant_one_id, participant_two_id → users; last_message_at for
      ordering; unique on the participant pair) and `messages` (conversation,
      sender → user, body text, read_at). Associations, validations (body
      present; sender must be a participant), a `between(a, b)` finder/creator
      that normalizes participant order. *Done when:* migrations run; creating a
      message from a participant works, from a non-participant is rejected; model
      specs green.
- [ ] **Step 2 - Serializers** — `ConversationSerializer` (other participant,
      last_message_at, unread count for the viewer) + `MessageSerializer`.
      *Done when:* covered by the request specs below.
- [ ] **Step 3 - REST endpoints** — `GET /conversations` (mine, newest first),
      `POST /conversations` (find-or-create with a given user), `GET
      /conversations/:id/messages` (paginated, participant-only), `POST
      /conversations/:id/messages` (post; participant-only). Scope every action to
      the authenticated user (admin may access any). *Done when:* a participant
      CRUDs; a non-participant is 403/404; request specs green.
- [ ] **Step 4 - ChatChannel (live)** — subscribe to a conversation you're a
      participant in (reject otherwise); posting a message (via the endpoint or
      the channel) broadcasts it to the conversation stream so both clients get it
      live. Broadcast on message create. *Done when:* a channel spec subscribes as
      a participant, rejects a non-participant, and receives a broadcast on a new
      message.

## Files / areas

- `db/migrate/*_create_conversations.rb`, `*_create_messages.rb`
- `app/models/conversation.rb`, `app/models/message.rb`, assoc on `User`
- `app/serializers/conversation_serializer.rb`, `message_serializer.rb`
- `app/controllers/api/v1/conversations_controller.rb`,
  `app/controllers/api/v1/messages_controller.rb`
- `app/channels/chat_channel.rb`
- `config/routes.rb`
- Specs: `spec/models/`, `spec/requests/api/v1/`, `spec/channels/`

## Data / contracts

**Conversation** (LOAD-BEARING — mobile chat depends on it):
- `participant_one_id`, `participant_two_id` (bigint → users; store the lower id
  first so a pair maps to exactly one row)
- `last_message_at` (datetime, for newest-first ordering)
- unique index on `[participant_one_id, participant_two_id]`

**Message** (LOAD-BEARING):
- `conversation_id` (fk), `sender_id` (fk → users)
- `body` (text, present)
- `read_at` (datetime, null until the OTHER participant reads it)
- index `[conversation_id, created_at]`

**Broadcast shape:** `MessageSerializer` hash, broadcast to a per-conversation
stream (e.g. `"conversation:#{id}"`).

## Testing

`bundle exec rspec` is the gate.

- **Model specs:** body required; sender must be a participant; `between(a,b)`
  normalizes order and is idempotent (same pair → same conversation); message
  bumps `last_message_at`.
- **Request specs (auth scoping — load-bearing):** list returns only my
  conversations; a non-participant gets 403/404 on messages; posting appends;
  admin can access any conversation.
- **Channel spec:** participant subscribes/streams; non-participant rejected;
  new message broadcasts to the stream.
- `bin/rubocop` + `bin/brakeman` clean.

## Notes for the AI

- Reuse the JWT/`current_user` auth. Staff endpoints already use
  `require_employee!`; chat is available to any authenticated user (customer,
  staff, admin), so gate on authentication, then participant membership.
- **Normalize the participant pair** (min id, max id) so (A,B) and (B,A) are one
  conversation. Enforce with the unique index + a `between` builder.
- Broadcast the SAME serialized shape the REST endpoint returns, so the client
  renders a live message identically to a fetched one.
- Don't build presence/typing/receipts (2c) or push (2d) here.
- Match existing conventions: Blueprinter serializers, `rescue_from` status
  mapping, thin controllers, `paginate` helper (already in ApplicationController).
