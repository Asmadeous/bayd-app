# Project Plan

## 1. Problem — What problem are we solving?

**B.A.Y.D (Beauty @ Your Door)** is a mobile beauty service: technicians travel to
the customer's home to perform nail, lash, waxing, massage, and spa services. The
platform lets customers book a service to their address, matches and dispatches
the nearest eligible technician (factoring travel time and coverage), takes
payment, and gives staff the tools to run the day (schedule, location, earnings).

The project is currently mid-migration: booking/availability is being moved OFF
SimplyBook.me onto our own scheduling engine, and native mobile apps (iOS +
Android via Capacitor) are being built for customers and for staff/admin.

## 2. Users — Who is this for?

- **Customers** — book, schedule, reschedule, and cancel at-home beauty
  appointments (with add-ons), choosing a technician and an available time.
- **Technicians (staff)** — see their jobs, clock in/out, share live location,
  charge customers (NFC POS), track earnings/tips/fuel, manage their availability.
- **Admins** — dispatch, oversee all bookings and staff, analytics, content
  (blog/products/gallery), and configuration.

## 3. Features — What exists / what the MVP needs

### Already shipped (see build-plan for the checked list)
- Guest + passwordless customer auth (email-keyed magic links); staff/admin
  password auth.
- Service catalog (categories, services, per-client-type pricing, add-ons).
- Booking + dispatch: `AssignmentService` matches nearest on-shift eligible tech
  by FSA coverage + travel feasibility; `no_double_booking` Postgres exclusion
  constraint; group + add-on duration handling.
- Payments: Helcim + Square gateways, gift cards, tips, invoices, subscriptions,
  webhook reconciliation.
- Staff ops: shifts (clock-in/out attendance + GPS + fuel reimbursement), live
  location pings, partner payouts.
- Content + community: blog, products/variants, gallery, forum, reviews,
  newsletter, contact/franchise/job forms.
- Admin dashboards + analytics.
- SimplyBook.me two-way integration (booking push, availability, client sync) —
  **being removed**.

### Roadmap (the why is in docs/CUSTOM_PLATFORM_AND_MOBILE_PLAN.md)
- Replace SimplyBook with a custom availability/booking engine we own.
- Real-time chat (staff↔customer, staff↔admin) + push notifications.
- Customer mobile app (Capacitor).
- Staff/admin mobile app (Capacitor) with Square Tap to Pay NFC POS + live
  location + day-of customer ETA.

## 4. Data — What are the core entities?

`User` (roles: customer/employee/admin) · `EmployeeProfile` + `EmployeeService` +
`EmployeeServiceArea` (FSA coverage) · `Service` / `ServiceCategory` · `Address`
(PostGIS) · `BookingRequest` → `Booking` (parent/child for add-ons) ·
`Shift` / `LocationPing` / `EmployeeCurrentLocation` · payments (`Payment`,
`Invoice`, `GiftCard`, `Tip`, `Subscription`, `PartnerPayout`) · `Notification` ·
`SyncEvent` (webhook idempotency) · content (`BlogPost`, `Product`, `ForumPost`,
`Review`, …).

## 5. Tech — What's the stack? (as-built)

- **Backend:** Ruby 4.0.2, Rails 8.1 (API-only). PostgreSQL + PostGIS. Solid
  Queue (jobs) + Solid Cache — Postgres-backed, **no Redis**. Deployed with Kamal
  to api.baydspa.ca.
- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind, TanStack Query) in
  `client/`, on :3003.
- **Realtime (planned):** ActionCable backed by **Solid Cable** (Postgres).
- **Push (planned):** FCM (Android + iOS via APNs).
- **Mobile (planned):** Capacitor (iOS + Android), two apps.
- **Payments/POS:** Square (incl. planned Tap to Pay), Helcim.

> TODO (confirm): monetization / commercials (commission split, partner payout
> terms) — not derivable from code; fill in if you want it tracked here.

## 6. UI/UX — Look and feel

Existing Next.js customer web app defines the visual language (booking flow +
dashboards). Mobile apps reuse it where possible (customer app = Capacitor wrap of
the Next.js app; staff/admin app likely a dedicated SPA).
