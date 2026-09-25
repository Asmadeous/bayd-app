# Build Plan

Features in rough build order, one line each. Checked items are already shipped
(this is a brownfield adoption — the plan reflects reality). Unchecked items are
the roadmap from `docs/CUSTOM_PLATFORM_AND_MOBILE_PLAN.md`. Run `/feature` with no
number to spec the next unchecked item.

## Shipped

- [x] Customer auth — passwordless email/magic-link + guest booking
- [x] Staff/admin auth — password login
- [x] Service catalog — categories, services, per-client-type pricing
- [x] Service add-ons — note-only, lash-siloed, admin-alerted
- [x] Address capture + PostGIS geocoding + FSA coverage
- [x] Booking + dispatch — nearest-eligible-tech assignment, travel feasibility
- [x] Double-booking protection — Postgres exclusion constraint (422 on conflict)
- [x] Group bookings — one long booking, party-extended duration
- [x] Reschedule + cancel
- [x] Payments — Helcim + Square gateways, webhook reconciliation
- [x] Gift cards, tips, invoices
- [x] Subscriptions / recurring bookings
- [x] Staff shifts — clock-in/out attendance, GPS, fuel reimbursement
- [x] Staff live location — location pings
- [x] Partner payouts
- [x] Notifications (in-app)
- [x] Admin dashboards + analytics
- [x] Content — blog, products/variants, gallery, reviews, forum, newsletter
- [x] Intake forms — contact, franchise, job applications, phone-booking follow-up
- [x] SimplyBook.me integration — booking push, availability, client sync (to be removed)

## Roadmap — Phase 1: Custom scheduling (replace SimplyBook)

- [x] 1. Custom availability engine + drop SimplyBook
  - [x] 1a. Bookable-hours schedule model — `AvailabilitySchedule` (weekly
        template) + `AvailabilityOverride` (date-specific) models, migrations,
        associations, and CRUD endpoints (tech self-serve + admin). Pure addition,
        nothing removed.
  - [x] 1b. AvailabilityEngine — a service that computes a tech's free slots for a
        date (schedule/overrides − existing bookings − travel time − turnaround,
        15-min floor). Standalone + unit-tested; not wired into endpoints yet.
  - [x] 1c. Cutover — rewire `AvailabilityController` (`#show`, `#any`,
        `next_available_date`) and the `AssignmentService` booking path onto
        `AvailabilityEngine`, preserving the exact JSON contracts. SimplyBook no
        longer the source of slots.
  - [x] 1d. Remove SimplyBook — delete `services/simplybook/*`, webhook, reconcile
        job, mapping tasks; strip SB branches from models/serializers/controllers;
        drop `simplybook_*` columns.

## Roadmap — Phase 2: Realtime + push

- [x] 2. Chat + push backend
  - [x] 2a. Solid Cable + ActionCable foundation — install `solid_cable`,
        configure `config/cable.yml` (Postgres, no Redis) + the cable DB, mount
        ActionCable, and an authenticated `Connection` (reuse the JWT auth) that
        identifies the current user. No features yet — just the live pipe, proven
        by a trivial channel.
  - [x] 2b. Chat — `Conversation` + `Message` models (participants:
        customer↔staff, staff↔admin), authorization (you only see your own
        conversations; admin sees all), REST endpoints (list convos, list/post
        messages), and a `ChatChannel` that broadcasts new messages live.
  - [x] 2c. Presence + receipts — online/away presence, typing indicators, and
        read receipts over ActionCable.
  - [x] 2d. FCM push — `device_tokens` (user, platform, token) registered from the
        apps, a `PushService`, and wire `NotificationService.deliver` to also send
        a push (iOS via APNs through FCM). Notify on new booking, reschedule/
        cancel, new chat message, payment events.

## Roadmap — Phase 3: Customer mobile app

A PURPOSE-BUILT Capacitor app with an app-first UI (native navigation + app
screens) — NOT the marketing website wrapped in a shell. It reuses `client/`'s
API layer, TypeScript types, and primitive components (buttons/inputs/design
tokens), but has its own app screens. Same Rails API. The website stays a
separate website. Customer first; staff/admin is Phase 4.

- [ ] 3. Customer Capacitor app
  - [ ] 3a. App project + shared package — a new Capacitor app (its own SPA, e.g.
        `apps/customer/`), plus a shared package that exposes `client/`'s API
        client + types + primitive components so the app and website define the
        API contract once. App boots (blank authed shell) against the Rails API.
  - [ ] 3b. Capacitor shell + native setup — iOS + Android projects, icon/splash,
        `NEXT_PUBLIC_API_URL`, status bar / safe areas / back button, secure token
        storage. App installs + boots on a simulator.
  - [ ] 3c. Auth + core screens — app-first login (passwordless email), and the
        core customer screens built for the app: book (service → tech → available
        time → add-ons → pay), my bookings (reschedule/cancel), profile.
  - [ ] 3d. Push registration — on login, request notification permission, get the
        FCM token via a Capacitor push plugin, register it with the 2d
        `POST /device_tokens` endpoint; unregister on logout.
  - [ ] 3e. Live chat in-app — ActionCable client (2a-2c): conversation list,
        thread, live messages, typing, presence, read receipts.
  - [ ] 3f. Day-of tech ETA — on the booking day, show the assigned tech's live
        location + ETA (consumes staff location; needs the live-tracking channel).

## Roadmap — Phase 4: Staff/admin mobile app

A purpose-built Capacitor app (app-first UI, same sharing model as Phase 3),
role-conditional for staff vs admin. NOT a wrapped website.

- [ ] Staff/admin Capacitor app — role-conditional UI, Square Tap to Pay NFC POS,
      background live location, clock-in/out, jobs, availability editing, chat, push

## Roadmap — Phase 5: Auth, reminders, group booking hardening

- [ ] 5. Auth + reminders + group verify
  - [ ] 5a. Phone OTP login (Infobip) — customers log in by phone number + a
        one-time code sent via Infobip SMS, as an ALTERNATIVE to the email
        magic-link. Request-code / verify-code endpoints, rate-limited, code
        hashed + short-TTL. Infobip call isolated behind an adapter (like
        Fcm::Client); inert without creds; specs stub the SMS. Staff keep passwords.
  - [ ] 5b. Booking reminders (Solid Queue) — four reminders per booking, each via
        NotificationService (in-app + email + push): (1) on-book confirmation,
        (2) 1 day before, (3) on booking day, (4) day-of dispatch reminder (staff).
        To customer AND assigned staff. Scheduled jobs (perform_at on create,
        rescheduled on reschedule, cancelled on cancel), idempotent so a reminder
        is NEVER missed or double-sent.
  - [ ] 5c. Group booking wiring audit — group is already built (client_type
        group, party_size, duration scaling, deposit). VERIFY it flows correctly
        through new bookings + every new feature (reminders, OTP login, push,
        chat, ETA). Fix gaps found; no group-logic redesign unless a gap needs it.
  - [ ] 5d. Passkeys / biometric MFA (WebAuthn) — any user can OPTIONALLY register
        a passkey (Face ID / fingerprint / device biometric) for stronger login.
        Server-side WebAuthn (registration + assertion) + credential storage;
        Capacitor/web client integration. Opt-in, additive to existing auth.

## Roadmap — Phase 6: Editable booking calendar

- [x] 6. Editable booking calendar — a List | Calendar toggle on every bookings
      screen (list stays the default); appointments are managed from the calendar
      under each role's existing rules. Staff: view + existing actions only (no
      reschedule/cancel). "Delete" means cancel; bookings are never hard-deleted.
  - [x] 6a. Backend + dashboard calendars — `from`/`to` date range on the customer,
        staff, and admin booking lists; fix admin booking `show`; remove admin
        hard delete; bucket days in the company zone; shared calendar component
        (month/week/day) with an appointment detail sheet and tap-empty-slot
        create; replaces the read-only calendars on all three dashboards.
  - [x] 6b. App calendars — Calendar toggle on customer app Bookings and staff app
        Schedule (month strip + day timeline), reusing 6a.
  - [x] 6c. Admin calendar tools — drag-to-reschedule (same availability and
        double-booking checks as the reschedule dialog) and a tech availability +
        blackout overlay; pairs with the admin schedule editor.
