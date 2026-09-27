# B.A.Y.D (Beauty @ Your Door) - Project Overview

> A mobile at-home beauty service: technicians travel to the customer's address to
> perform nail, lash, waxing, massage, and spa services. Book online, get matched
> to the nearest eligible tech, pay, and (for staff) run the day.

## Problem

Booking an at-home beauty appointment means matching a customer's address and
chosen time to a technician who performs that service, covers that area, and can
physically get there around their other jobs. Today that scheduling/availability
brain lives in a third party (SimplyBook.me); the project is bringing it in-house
and adding native mobile apps for customers and staff.

## Users

- **Customers** (guest or passwordless email login) - book / schedule / reschedule
  / cancel at-home appointments with add-ons, choosing a technician and an
  available time slot.
- **Technicians / staff** (password login) - see jobs, clock in/out, share live
  location, charge customers (NFC POS), track earnings/tips/fuel, set availability.
- **Admins** (password login) - dispatch, oversee all bookings + staff, analytics,
  content, configuration.

## Features

Shipped features (checked in build-plan) are the existing platform. The roadmap
below is Phase order - this is what's next.

**Shipped (foundation):** auth (guest + passwordless customer, password staff),
service catalog + add-ons, address/PostGIS + FSA coverage, booking + nearest-tech
dispatch (`AssignmentService`), `no_double_booking` constraint, group bookings,
reschedule/cancel, payments (Helcim + Square, gift cards, tips, invoices,
subscriptions), staff shifts + live location + payouts, in-app notifications,
admin dashboards + analytics, content (blog/products/gallery/forum/reviews), and
the SimplyBook.me integration (being removed).

**Roadmap:**

1. **Custom scheduling engine (headline)** - replace SimplyBook: a weekly
   bookable-hours schedule per tech (+ date overrides), an `AvailabilityEngine`
   that computes free slots (schedule − bookings − travel time, 15-min floor),
   rewire booking/reschedule/cancel + availability endpoints onto it, then remove
   all SimplyBook code and columns.
2. **Realtime + push** - conversations/messages, ActionCable over Solid Cable
   (Postgres, no Redis) for live chat/presence, FCM push (device tokens; wire
   existing Notifications to push).
3. **Customer mobile app** - a PURPOSE-BUILT Capacitor app (app-first UI, its own
   screens/navigation), NOT the website wrapped. Reuses `client/`'s API layer +
   types + primitive components; own app screens. Push, live chat, day-of ETA.
4. **Staff/admin mobile app** - purpose-built Capacitor app, role-conditional,
   Square Tap to Pay NFC POS, background live location, clock-in/out, jobs,
   availability editing. Same sharing model. NOT a wrapped website.
5. **Auth, reminders, group hardening** - phone OTP login (Infobip), booking
   reminders via Solid Queue, a group-booking wiring audit, optional passkeys
   (WebAuthn).
6. **Editable booking calendar** - a List | Calendar toggle on every bookings
   screen (list stays default), managing appointments under each role's
   rules. Staff fully edit their OWN appointments (create, reschedule, cancel,
   drag to move); reassigning to another tech stays admin. "Delete" means
   cancel, bookings are never hard-deleted.
   - 6a. Backend + dashboard calendars: `from`/`to` date range on the customer,
     staff, and admin booking lists; fix admin booking `show`; remove admin hard
     delete; company-zone day bucketing; shared month/week/day calendar with a
     detail sheet and tap-empty-slot create on all three dashboards.
   - 6b. App calendars: customer app Bookings + staff app Schedule, reusing 6a.
   - 6c. Admin tools: drag-to-reschedule (same availability + double-booking
     checks) and a tech availability/blackout overlay.
   - 6d. Staff calendar editing (staff app): tap an empty hour to book with date
     + time pre-filled, reschedule/cancel from the job page, long-press drag to
     move; own bookings only, reusing `Booking#reschedule!` and the admin cancel
     path. In-app guidance: first-use hint, explanatory confirms, plain errors.
7. **Payments hardening** - no-show collected at full price, a card on file
   required to book, gift cards accepted at the tech's checkout.
   - 7a. No-show charges full price: `NoShowChargeJob` charges the booking's full
     service price (incl. add-ons) to the card on file instead of the flat
     `Setting.no_show_fee`; if it can't charge (no card, declined), the balance
     stays outstanding and admin is alerted (in-app + email).
   - 7b. Card required to book (web): card step in `/book` (Square Web Payments
     SDK, token only) + a timestamped no-show/late-cancel policy consent; "pay
     now" charges the saved card instead of a second hosted checkout.
   - 7c. Customer app card on file: purpose-built Payment screen under Account,
     same card + consent step in the app booking flow.
   - 7d. Gift card in the tech Charge sheet: balance applied first, remainder via
     card / cash / Interac / cheque.
8. **Store readiness** - what App Store + Google Play review require.
   - 8a. In-app account deletion (customer app, web, staff app, public web
     page): erase personal data, sign out everywhere, cancel upcoming
     bookings; keep bookings/payments/invoices anonymized (tax + payouts).
   - 8b. Public /privacy and /terms (contact Bookings@baydspa.ca), linked from
     sign-up, Account/Profile and the footer; legal review before submission.
   - 8c. Staff location disclosure before first on-shift sharing + App Review /
     Play Data safety notes (`deploy/mobile/STORE_REVIEW.md`). Only the
     customer app goes to store review; staff app stays on TestFlight / Play
     internal.

## Data model

Existing models (abbreviated to what scheduling touches) plus the **new** models
Phase 1 introduces. Existing schema is authoritative in `db/schema.rb`.

### EmployeeProfile (exists)
- belongs_to `user`; `active`, `dispatchable`, `on_shift` (bool)
- `base_latitude` / `base_longitude` (decimal) - home base for distance
- `service_fsas` (array) - FSA coverage (via `employee_service_areas`)
- has_many `services` through `employee_services` - what this tech performs
- has_many `bookings`, `shifts`, `location_pings`

### Service (exists)
- `name`, `duration_minutes` (int), `service_category_id`
- per-client-type pricing (`price_for`); `simplybook_event_id` (to be dropped)

### Booking (exists)
- belongs_to `user`, `employee_profile`, `service`, `address`, `booking_request`
- `starts_at` / `ends_at` (UTC; wall-clock is company zone via `BusinessHours`)
- `status` (pending/confirmed/in_progress/…); `party_size`; `parent_booking_id`
- `raw` (jsonb, holds note-only add-ons); `simplybook_id` (to be dropped)
- **`no_double_booking`**: Postgres exclusion constraint on
  (`employee_profile_id`, `tsrange(starts_at, ends_at)`) where status is active -
  authoritative; conflict -> 422. **Load-bearing; keep.**

### User payment fields (exist - Phase 7 depends on them)
- `square_customer_id`, `square_card_id`, `card_brand`, `card_last4` - the card
  on file. Square tokenizes the card; we never store card numbers (PCI SAQ A).
- `card_on_file?` is true when `square_card_id` is present.
- Phase 7b adds a timestamped no-show/late-cancel policy consent (field shape
  locked in the 7b spec).

### Shift (exists - attendance, NOT bookable hours)
- clock-in/out timestamps + GPS + distance + fuel reimbursement. Records that a
  tech actually worked. **Not** the calendar customers book against.

### AvailabilitySchedule (NEW - Phase 1)
- belongs_to `employee_profile`
- `day_of_week` (int 0-6) - recurring weekly template
- `start_time` / `end_time` (time-of-day, company zone)
- multiple rows per day allowed (split shifts)
- > Lock this shape - the AvailabilityEngine and later mobile availability editing
  depend on it.

### AvailabilityOverride (NEW - Phase 1)
- belongs_to `employee_profile`
- `date` (date)
- `available` (bool) - true = extra availability that day; false = blackout
  (vacation/sick/one-off)
- optional `start_time` / `end_time` for a partial-day override
- an override wins over the weekly template for its date
- > Lock this shape alongside AvailabilitySchedule.

**Availability = for (tech, date):** the day's schedule/override window
− existing bookings (with durations, incl. add-on/group extension)
− travel time between consecutive jobs (`TravelFeasibility`, estimated, 15-min
floor) − minimum turnaround. Booking horizon is **unlimited** (no cap), though
"next available" search is bounded.

## Tech stack

- **Ruby 4.0.2 / Rails 8.1 (API-only)** - the backend and primary app.
- **PostgreSQL + PostGIS** - data + geospatial; the only datastore.
- **Solid Queue / Solid Cache / (planned) Solid Cable** - jobs, cache, and
  websockets, all Postgres-backed. **No Redis.**
- **Next.js 16 / React 19 / TypeScript / Tailwind / TanStack Query** (`client/`) -
  the web app; also the base for the customer Capacitor app.
- **Capacitor** (planned) - iOS + Android, two apps (customer / staff+admin).
- **ActionCable** (planned, on Solid Cable) - chat/presence. **FCM** (planned) -
  push. **Square** (incl. planned Tap to Pay) + **Helcim** - payments/POS.
- **Kamal** - deploy to api.baydspa.ca. **Blueprinter** - serialization.
  **RSpec / rubocop-rails-omakase / brakeman** - tests / lint / security.

## Monetization

At-home beauty service revenue (bookings + add-ons + products), with partner
payouts + tips tracked. `> TODO (confirm)`: commission split / partner terms not
derivable from code.

## UI/UX

Existing Next.js customer web app defines the visual language (booking flow +
dashboards). Key surfaces: `/book` (service → tech → available time → add-ons →
pay), customer dashboard (bookings, reschedule/cancel), staff dashboard, admin
dashboard. Mobile apps reuse this where possible. Every bookings screen gets
a List | Calendar toggle (roadmap 6).

## Deployment

- **Kamal** to **api.baydspa.ca**; deploy on merge to `main` (`deploy.yml`).
- Postgres host service (not containerized); app connects over the Docker bridge.
- `db:seed` runs on every deploy - seeds must be idempotent + never clobber live
  state.
- Env by name (not values): `ALLOWED_ORIGINS`, `SIMPLYBOOK_*` (to be removed),
  `SQUARE_*`, `HELCIM_*`, `ADMIN_NOTIFY_EMAIL`, `FUEL_RATE_PER_KM`. Phase 2+ adds
  FCM + Square Tap to Pay credentials.
- Verify: `bin/ci` (rubocop + bundler-audit + brakeman; **not** rspec - run rspec
  separately).

## Open questions

> - Commission split / partner payout terms (`project-plan.md` §5) - confirm or
>   leave untracked.
> - Availability slot granularity (15-min? per-service duration?) and default
>   turnaround/buffer values - to be decided when speccing the AvailabilityEngine.
> - Square Web Payments SDK inside the Capacitor app (`capacitor://` origin) is
>   unverified; prove it on a test build at the start of 7c.
