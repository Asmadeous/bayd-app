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

- [ ] 2. Chat + push backend
  - [x] 2a. Solid Cable + ActionCable foundation — install `solid_cable`,
        configure `config/cable.yml` (Postgres, no Redis) + the cable DB, mount
        ActionCable, and an authenticated `Connection` (reuse the JWT auth) that
        identifies the current user. No features yet — just the live pipe, proven
        by a trivial channel.
  - [x] 2b. Chat — `Conversation` + `Message` models (participants:
        customer↔staff, staff↔admin), authorization (you only see your own
        conversations; admin sees all), REST endpoints (list convos, list/post
        messages), and a `ChatChannel` that broadcasts new messages live.
  - [ ] 2c. Presence + receipts — online/away presence, typing indicators, and
        read receipts over ActionCable.
  - [ ] 2d. FCM push — `device_tokens` (user, platform, token) registered from the
        apps, a `PushService`, and wire `NotificationService.deliver` to also send
        a push (iOS via APNs through FCM). Notify on new booking, reschedule/
        cancel, new chat message, payment events.

## Roadmap — Phase 3: Customer mobile app

- [ ] Customer Capacitor app — static-export build of the Next.js client wrapped
      in Capacitor (iOS + Android), push registration, live chat, day-of tech ETA

## Roadmap — Phase 4: Staff/admin mobile app

- [ ] Staff/admin Capacitor app — role-conditional UI, Square Tap to Pay NFC POS,
      background live location, clock-in/out, jobs, availability editing, chat, push
