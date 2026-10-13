# Feature: Admin app - Home and Bookings

**From build-plan:** feature 11b (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

The admin app's Dashboard and Bookings sections do everything the web
dashboard's do: Overview, Analytics, Calendar, Bookings (list and calendar, every
booking action), New booking, Booking requests, Subscriptions and Work-scope
calls, laid out for a phone.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin` | `/admin/home` | active work, 4 metrics, shortcuts, recent bookings |
| `/dashboard/admin/analytics` | `/admin/analytics` | the same metrics and periods |
| `/dashboard/admin/calendar` | `/admin/calendar` | company calendar |
| `/dashboard/admin/bookings` | `/admin/bookings` | list or calendar, status filter, New booking |
| (booking card actions) | `/admin/bookings/view?id=` | details plus reassign, reschedule, start, complete, collect payment, cancel; visit actions |
| `/dashboard/admin/bookings/new` | `/admin/bookings/new` | the same admin booking form |
| `/dashboard/admin/booking-requests` | `/admin/booking-requests` | the same lists, filters and actions |
| `/dashboard/admin/subscriptions` | `/admin/subscriptions` | the same list, edit, cancel, delete |
| `/dashboard/admin/meetings` | `/admin/meetings` | the same list and delete |

Booking actions reuse the web's own components (`AdminBookingActions`,
`AdminVisitActions`, `RescheduleDialog`, `CollectPaymentButton`,
`NewBookingForm`) so the rules can't drift; the calendar reuses the phone
calendar pieces the staff app uses (`components/calendar/*`).

## Out of scope

- Other menu sections (11c to 11g).

## Build steps

- [x] **Step 1 - Booking screen and Home** - app booking card, booking screen
  with every action, Home (Overview). *Done when:* tsc + lint green; actions
  match the web booking card's.
- [x] **Step 2 - Bookings and Calendar** - list with status filter, calendar
  view, Calendar screen.
- [x] **Step 3 - New booking** - the admin booking form in the app.
- [x] **Step 4 - Analytics**
- [x] **Step 5 - Booking requests**
- [x] **Step 6 - Subscriptions**
- [x] **Step 7 - Work-scope calls** - then build, install on the phone and
  compare every screen with the web. *Done when:* each screen matches its web
  page.

## As built

- Home, Analytics, Company Calendar, Bookings (list and calendar), the booking
  screen, New booking, Booking requests (with assignment details),
  Subscriptions and Work-scope calls, each compared with its web page on your
  phone (same data, same actions).
- Booking actions are the web's own `AdminBookingActions` (reassign,
  reschedule, start, complete, collect payment, cancel, visit actions); New
  booking is the web's `NewBookingForm` (new `embedded`/`backHref` options).
- The calendar is a week strip that opens to the month, plus the day's hour
  grid: technician filter, "Show cancelled", the tech's bookable hours shaded
  (`UnavailableShading` moved to `components/calendar/` and shared with the web
  calendar), tap to open, tap an empty time to book, hold and drag to move.
- New `useAdminBooking(id)` hook for the booking screen.
- Web fix along the way: Analytics' tax line says the franchise's own tax name
  (was hard-coded "HST").
- Noted, not changed: the web Booking Requests page shows request times in the
  viewer's time zone; the app shows the franchise's.

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
- Hamburger drawer only; add each finished screen to `BUILT` in
  `app/admin/admin-menu.tsx`.
- The admin tree must not import from other `app/` trees (the mobile build
  stashes them); shared code lives in `components/` and `lib/`.
- Test on the phone against the local API; never an emulator; check the app is
  in front before each tap.
