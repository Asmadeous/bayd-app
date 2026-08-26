# Feature: 2d - FCM push notifications

**From build-plan:** feature 2d (under 2. Chat + push backend)
**Status:** not started

## Goal

Deliver lock-screen push to the mobile apps for the events users care about.
Rails owns everything except the final hop: waking a closed phone requires the OS
vendors' gateways (APNs/FCM) — no server can bypass that. So we store device
tokens, build a `PushService`, isolate the one FCM HTTP call behind an adapter,
and wire it into the existing `NotificationService.deliver` so every in-app
notification also pushes. Uses the **FCM HTTP v1 API**.

## In scope

- `device_tokens` table (user, platform ios/android/web, token) + registration
  endpoints (register/unregister from the apps).
- `Fcm::Client` adapter — mints an OAuth2 token from the service-account JSON
  (via `googleauth`) and POSTs to `https://fcm.googleapis.com/v1/projects/{id}/messages:send`.
- `PushService.push(user:, title:, body:, data:)` — sends to all the user's
  device tokens, prunes tokens FCM reports as unregistered.
- Wire `NotificationService.deliver` to also push (best-effort, never breaks the
  in-app + email path).
- Credential + project id from ENV; inert (no-op) until configured. Specs stub the
  HTTP call — no real FCM traffic.

## Out of scope (deferred)

- **2c** — presence/typing/receipts (separate, pure-Rails).
- Native app token registration UI (Phase 3/4 call the endpoints).
- Rich pushes (images/actions), topic/multicast sends, APNs-direct.

## Build loop

One step at a time: diff, explain, verify, optional checkpoint, next.

## Build steps

- [ ] **Step 1 - DeviceToken model + migration + endpoints** — `device_tokens`
      (user, platform, token unique). Model + `has_many` on User. Staff/customer
      endpoints: `POST /device_tokens` (register/upsert for current_user),
      `DELETE /device_tokens/:token` (unregister). Scoped to current_user.
      *Done when:* migration runs; register upserts, unregister removes; a user
      can't see another's tokens; specs green.
- [ ] **Step 2 - Fcm::Client adapter** — add `googleauth` + `faraday` (already
      present). `Fcm::Client#send_to(token:, title:, body:, data:)` builds the v1
      body and POSTs with an OAuth2 bearer minted from
      `ENV["FCM_CREDENTIALS_JSON"]` for project `ENV["FCM_PROJECT_ID"]`, scope
      `https://www.googleapis.com/auth/firebase.messaging`. Returns a small result
      (ok / unregistered / error). No-op when unconfigured. *Done when:* a spec
      stubs the token mint + HTTP POST and asserts the request URL + body shape;
      unconfigured returns a no-op without calling out.
- [ ] **Step 3 - PushService + wire into NotificationService** — `PushService.push`
      sends to each of the user's device tokens via `Fcm::Client`, deletes tokens
      that come back `unregistered`. `NotificationService.deliver` calls it
      best-effort after persisting the in-app record. *Done when:* delivering a
      notification triggers a push per token (stubbed); a failing push never
      breaks the in-app/email path; unregistered tokens are pruned; specs green.

## Files / areas

- `db/migrate/*_create_device_tokens.rb`
- `app/models/device_token.rb`, assoc on `User`
- `app/controllers/api/v1/device_tokens_controller.rb`, `config/routes.rb`
- `app/services/fcm/client.rb` (the isolated external call)
- `app/services/push_service.rb`
- `app/services/notification_service.rb` (wire in the push)
- `Gemfile` (+ `googleauth`)
- Specs: `spec/models/`, `spec/requests/`, `spec/services/`

## Data / contracts

**DeviceToken:**
- `user_id` (fk), `platform` (enum: ios/android/web), `token` (string, unique)
- one row per token; registering an existing token re-points it to current_user

**FCM HTTP v1 (verified against Google docs):**
- `POST https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send`
- body: `{ "message": { "token": "...", "notification": { "title": "...", "body": "..." }, "data": { ...string values... } } }`
- auth: `Authorization: Bearer <oauth2>`, scope `.../auth/firebase.messaging`
- a 404/`UNREGISTERED` response → delete that device token

**ENV (names only):** `FCM_PROJECT_ID`, `FCM_CREDENTIALS_JSON` (the
service-account key JSON). Absent → PushService is a no-op.

## Testing

`bundle exec rspec` is the gate.

- **Model:** token uniqueness; registering an existing token moves it to the new
  user; platform enum.
- **Request:** register upserts for current_user; unregister removes; auth
  required; can't touch another user's tokens.
- **Fcm::Client:** stub the OAuth2 mint + Faraday POST; assert endpoint URL +
  message body; unconfigured → no HTTP call.
- **PushService / NotificationService:** push sent per token (stubbed);
  best-effort (a raise doesn't break deliver); unregistered token pruned.
- `bin/rubocop` + `bin/brakeman` clean. No real network in specs.

## Notes for the AI

- **Rails owns all of this except the one FCM HTTP call** — keep that call behind
  `Fcm::Client` so the rest is plain Rails and fully testable with stubs.
- **Never read the real credential in a spec.** Stub `Fcm::Client`. The service is
  a no-op when `FCM_PROJECT_ID`/`FCM_CREDENTIALS_JSON` are absent.
- Best-effort everywhere: a push failure must never break the in-app Notification
  or the email (mirror the existing rescue in NotificationService).
- Reuse `current_user` auth; scope tokens to the authenticated user.
- Do NOT read `.env` or print secrets. Credentials come from ENV at runtime only.
