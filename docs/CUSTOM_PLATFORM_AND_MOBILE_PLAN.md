# B.A.Y.D — Custom Platform + Mobile App Plan

**Status:** Planning only. Nothing here is built yet. This document is the agreed
direction, decisions, and phased roadmap.

Two big initiatives, run together:

1. **Leave SimplyBook.me** — build our own scheduling / availability / booking
   engine and remove SimplyBook entirely.
2. **Mobile apps (Capacitor → iOS + Android)** — a customer app and a
   staff/admin app, with live chat (WebSockets), push notifications, staff
   location, and a staff NFC POS.

---

## Locked decisions

| Area | Decision |
|---|---|
| SimplyBook cutover | **Hard replace** — build a custom availability engine, delete SimplyBook. |
| Tech bookable hours | **Weekly recurring schedule** + date-specific overrides. Availability = schedule − bookings − travel time. |
| Staff POS / NFC | **Square Tap to Pay** (phone-as-terminal). Reuse existing `SquareService`. |
| Realtime + push | **Rails ActionCable backed by Solid Cable** (Postgres, **no Redis**) for WebSocket chat/presence + **FCM** (push, iOS via APNs + Android). |
| Booking horizon | **Unlimited** — customers can book as far into the future as they want. No cap. |
| Travel time (scheduling) | **Estimated, 15-min floor**: driving time = distance ÷ 35 km/h, never less than 15 min. This is the buffer the availability engine reserves between consecutive jobs. It is an *estimate* by necessity — you can't compute a future trip from live GPS. Already the model in `AssignmentService`/`TravelFeasibility` (`MIN_TURNAROUND_MIN = 15`). |
| Live tracking (day-of) | **Separate feature, not a scheduling input**: on the appointment day, track the tech's live speed/movement and show the customer a map + ETA (Uber-style). Does NOT feed which slots are bookable. |
| App structure | **Two Capacitor apps**: (1) customer, (2) staff+admin (role-conditional UI inside one app). |
| Customer mobile app | **Wrap the existing Next.js `client/`** via Capacitor (needs a static-export build — see risks). |
| Phase 1 | **Custom scheduling first** — de-risk the hardest part on the existing web app before mobile. |

---

## What already exists (build on this, don't reinvent)

- **Assignment engine** (`AssignmentService`) — eligibility (on-shift, performs
  service, FSA coverage, travel-feasible), nearest-tech ranking, on-demand vs
  scheduled, the `no_double_booking` Postgres exclusion constraint. This stays;
  it's the core of dispatch.
- **Travel feasibility** (`TravelFeasibility`) — shared by assignment + availability.
- **Add-ons** (`AddonBooker`) — note-only, lash-siloed, admin-alerted. Done.
- **Bookings / booking_requests / addresses / services / employee_services /
  service coverage (FSA)** — the whole domain model.
- **Payments**: `BookingPaymentService`, `SquareService`, `HelcimService`,
  `PaymentWebhookProcessor`, gift cards, tips, invoices, subscriptions.
- **Staff ops**: `Shift` (staff **clock-in / clock-out** to track that a tech
  actually worked — attendance, GPS at both ends, distance + fuel reimbursement),
  `LocationPing` / `EmployeeCurrentLocation` (live location already captured),
  `Notification` model (in-app, no push transport yet).
- **Customer web app** (`client/`, Next.js 16) — full booking flow + dashboards.

### Critical gaps this project fills

- **Availability/free-busy lives in SimplyBook today.** `availability_controller`
  calls `SimplyBook::Client#available_slots`. Replacing this is THE core task.
- **No bookable-hours model.** `Shift` is **attendance** — the tech's clock-in /
  clock-out tracking that they actually worked (with GPS + fuel). It is NOT a
  forward "customer can book me at this time" calendar. A weekly availability
  template (what customers book against) is net-new and separate from `Shift`.
- **No WebSockets** (no `app/channels/`, ActionCable not mounted).
- **No push transport** (Notification is in-app only; no FCM/APNs).
- **No chat/messaging model.**
- **No Capacitor / mobile shell.**
- **No phone-as-terminal POS** (Square service exists for online, not Tap to Pay).

---

## Phase 1 — Custom scheduling engine (replace SimplyBook)

**Goal:** the existing web app books, reschedules, cancels entirely on our own
calendar. SimplyBook code deleted. This is the highest-risk work, done first.

### 1a. Bookable-hours model (net-new)
- `availability_schedules` — weekly recurring template per tech
  (day_of_week, start_time, end_time; multiple rows per day for splits).
- `availability_overrides` — date-specific: extra availability or blackout
  (vacation, sick, one-off). An override wins over the template for its date.
- Admin + self-service UI to edit these (decision: techs self-serve their weekly
  template; admin can edit anyone's).
- **NOT** the `Shift` model. `Shift` stays as the tech's clock-in/out attendance
  tracker (actuals + fuel). The new schedule is *bookable hours* (intent). Two
  separate concerns: attendance vs. availability.

### 1b. Availability engine (net-new — replaces `SimplyBook#available_slots`)
- New `AvailabilityEngine` service: for (service, tech, date) →
  free slots = schedule/overrides for that day
  − existing bookings (with durations, incl. add-on/group extension)
  − travel time between consecutive jobs (reuse `TravelFeasibility`)
  − minimum turnaround.
- **Travel time is estimated with a 15-min floor** (distance ÷ 35 km/h, min 15).
  It MUST be an estimate: the engine answers "is 2pm three weeks out bookable?",
  and there is no live GPS for a future trip. Making the buffer depend on live
  speed would also make the calendar *flap* (the same slot toggling bookable as
  a tech drives around today) — bad UX and unschedulable. Keep the existing
  `MIN_TURNAROUND_MIN = 15` model. (Optional later: swap the flat 35 km/h for a
  routing-API distance matrix — still an estimate, just more accurate.)
- Slot granularity + duration handling must match how bookings are stored
  (wall-clock in company TZ, UTC in DB — the existing `BusinessHours` helpers).
- Rewrite `availability_controller` (`#show`, `#any`, `#next_available_date`) to
  call `AvailabilityEngine` instead of `SimplyBook::Client`.

### 1c. Booking lifecycle without SimplyBook
- Book: `AssignmentService` already creates the local `Booking` + trips the
  double-booking guard. Remove the `push_to_simplybook` / `register_simplybook_client`
  calls; the local booking becomes authoritative.
- Reschedule: validate the new slot against `AvailabilityEngine` +
  `no_double_booking`; update in place (there's already a reschedule spec/flow).
- Cancel: free the slot (status change already supported).
- Customer picks **an available slot** (from the engine), not an arbitrary time —
  already the intended UX; now enforced by our own free-busy.

### 1d. Remove SimplyBook
- Delete: `services/simplybook/*`, `webhooks/simplybook_controller`,
  `simply_book_reconcile_job`, `booking_mirror`, sync fields usage, the
  `simplybook_*` columns (migration to drop after cutover), mapping rake tasks.
- Strip SimplyBook branches from `assignment_service`, `booking_requests_controller`,
  `serializers`, `models` (`booking`, `employee_profile`, `service`, `partner`).
- Keep `sync_event` only if still used by payment webhooks (it is).

### 1e. Verification
- Full booking / reschedule / cancel flow on the web app with zero SimplyBook.
- Double-booking still returns 422; travel-time still filters slots; group +
  add-on durations still extend the slot correctly.

**Exit criteria:** a customer books, reschedules, and cancels on the web app; no
network call to SimplyBook exists anywhere; availability is computed by us.

---

## Phase 2 — Realtime + push backend (ActionCable + FCM)

**Goal:** the live layer both mobile apps depend on, built on the Rails backend.

### 2a. Chat / messaging model
- `conversations` (participants: customer↔staff, staff↔admin) + `messages`
  (sender, body, read_at, attachments later).
- Authorization: a customer only sees their own conversations; staff see theirs;
  admin sees all.

### 2b. ActionCable (WebSockets) — Solid Cable
- Add the `solid_cable` gem and configure `config/cable.yml` with the
  `solid_cable` adapter (Postgres-backed). **No Redis** — consistent with this
  app's existing Solid trifecta (`solid_queue` + `solid_cache` already run in
  production on Postgres). Solid Cable gets its own DB connection like the
  queue/cache DBs.
- Mount ActionCable; `ChatChannel` (per-conversation stream), `PresenceChannel`
  (online status), connection auth via the existing token/JWT auth.
- Broadcast on new message; typing/read receipts.

### 2c. Push notifications (FCM)
- `device_tokens` table (user, platform, token) — registered from the mobile apps.
- FCM server integration (a `PushService`); wire the existing `Notification`
  creation to also send a push. iOS delivered via FCM→APNs.
- Notify on: new booking, reschedule/cancel, new chat message, payment events,
  admin follow-ups (reuse existing Notification kinds).

### 2d. Verification
- Two clients exchange messages live; a push arrives on a real device (test build).

---

## Phase 3 — Customer mobile app (Capacitor wrap of Next.js)

**Goal:** ship the customer app to the App Store + Play Store.

- **Static-export build** of `client/` for Capacitor. **Risk:** app is currently
  `output: "standalone"` with dynamic routes (`blog/[slug]`) and likely
  server-only bits. Needs a mobile build target: either `output: "export"` with
  dynamic content fetched client-side, or a trimmed mobile entry that excludes
  SSR-only marketing pages. Spike this before committing the wrap.
- Capacitor shell: iOS + Android projects, splash/icon, deep links.
- Integrate device tokens (register with backend for push), ActionCable client
  for chat, native niceties (status bar, safe areas, back button).
- Customer scope: book / schedule / reschedule / cancel with add-ons, select
  staff + pick from *their available times*, full customer dashboard, chat,
  push, payments.
- Store submission (Apple review, Play review), privacy manifests.

---

## Phase 4 — Staff/Admin mobile app (Capacitor, role-conditional)

**Goal:** one app for staff + admin, UI gated by role.

- New Capacitor app (likely a fresh React SPA — the staff/admin dashboards may
  differ enough from the customer Next.js app that reuse is limited; confirm
  during the phase).
- **Staff:**
  - Square **Tap to Pay** POS — charge a customer's card by NFC on the tech's
    phone for bookings not paid online. Needs a Capacitor plugin bridging the
    Square Mobile Payments / Tap to Pay SDK (may require a custom native bridge —
    verify SDK + Capacitor support early).
  - Live location (reuse `LocationPing`) — background/foreground location so
    admin/dispatch sees where techs are. **Note:** live location is for dispatch
    visibility + day-of customer ETA, NOT an input to the availability
    calculation (see the travel-time decision above).
  - **Live tracking / ETA to the customer (day-of, separate feature):** on the
    appointment day, once the tech is en route, stream their position (via
    ActionCable) to the customer with a live map + ETA (Uber-style). Speed can be
    derived from consecutive `LocationPing`s or captured natively from the phone
    GPS (add `speed`/`heading` columns to `location_pings` — not present today).
  - Clock in/out (`Shift`), today's jobs, accept/complete bookings, availability
    schedule editing, chat, push, earnings/tips/fuel.
- **Admin:** dispatch view, all bookings, all conversations, staff locations,
  KPIs/analytics (some admin endpoints already exist), manage schedules.
- Role-conditional rendering inside the one app.

### POS / NFC risk (call out early)
- Square Tap to Pay has **native SDKs** (iOS/Android). Capacitor needs a plugin
  or custom bridge to call them. **Verify** an existing community plugin vs. a
  custom native module before Phase 4 — this is the single most uncertain piece.
- Device eligibility: Tap to Pay on iPhone requires specific iPhone models/iOS;
  Android has its own requirements. Confirm the techs' devices qualify.

---

## Cross-cutting

- **Auth:** existing model — customers passwordless/email-keyed, staff/admin
  password. Mobile apps need token persistence (secure storage) + refresh.
- **Deploy:** **no Redis needed** — Solid Cable runs ActionCable on Postgres
  (add its DB config + migrations, same pattern as `solid_queue`/`solid_cache`).
  Add FCM credentials; Square Tap to Pay credentials/merchant config.
- **Data migration:** at cutover, any live SimplyBook bookings must be represented
  locally (they largely already are via the mirror). Plan a freeze + reconcile.
- **Testing:** each phase ships behind verification (drive the real flow, not
  just specs). Mobile phases need real-device test builds (TestFlight / internal
  Play track).

---

## Open questions to resolve before each phase starts

- **Phase 1:** slot granularity (15-min? per-service?); buffer/turnaround
  defaults; do we drop `simplybook_*` columns immediately or after a grace
  period. (Booking horizon: **decided — unlimited, no cap.**)
- **Phase 2:** Solid Cable DB sizing / message retention (Postgres, no Redis to
  host).
- **Phase 3:** the static-export strategy (export vs trimmed mobile entry).
- **Phase 4:** Square Tap to Pay Capacitor bridge (plugin vs custom); staff
  device eligibility; background-location consent + battery policy.
- **Program:** rough timeline / who's building each phase.
