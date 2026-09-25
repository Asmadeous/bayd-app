# Feature: Editable booking calendar (6a + 6b + 6c)

**From build-plan:** features 6a, 6b, 6c (parent: 6. Editable booking calendar). The user asked for all of 6 in one pass, so 6b and 6c were built on this branch too; see the section below.
**Status:** completed 2026-09-25 (branch `feature/editable-calendar`, stacked on the
unmerged `fix/qa-batch-chat-charge-notifications` commit `aa69a4c`)

## Goal

Turn the three read-only dashboard calendars (customer, staff, admin) into
editable ones: month / week / day views of the right bookings, click an
appointment to act on it, click an empty day or slot to create one. Fix the
backend gaps that make today's calendars wrong (only 25 bookings shown, UTC day
bucketing, broken admin `show`, dangerous hard delete). This is the base that 6b
(apps) and 6c (admin drag + availability overlay) reuse.

## Decisions (locked 2026-09-24 - do not revisit)

| Decision | Choice |
| --- | --- |
| Default view | List stays the default; Calendar is a toggle. |
| Staff permissions | View + existing actions only (charge, navigate, call, manual booking). **No** staff reschedule or cancel. |
| Delete | "Delete" means cancel. Remove `DELETE /admin/bookings/:id`. Bookings are never hard-deleted. |
| Calendar build | Our own component, extending `AppCalendar`. No calendar library. |
| Customer create | Date only (their times come from availability in the booking flow). |

## In scope

- `from` / `to` date-range loading on the customer, staff, and admin booking
  lists (unpaginated inside a bounded range).
- Fix `GET /admin/bookings/:id` (currently `Booking.find(id, view: :full)`,
  which 404s for every booking).
- Remove admin hard delete (route + action).
- Place bookings by day and hour in the company zone (`BOOKING_TZ`), not UTC or
  the device zone.
- Shared calendar: Month, Week, Day. Week/Day are a time grid; below `sm`, Week
  falls back to Day.
- Appointment detail sheet with role-aware actions reusing existing components.
- Create from the calendar: customer (book with date), staff (manual booking with
  date + time), admin (new admin manual-booking page with a tech picker).
- Wire into `/dashboard/customer/bookings?view=calendar`, the staff dashboard
  calendar view, and `/dashboard/admin/calendar` (tech filter, "show cancelled").

## Out of scope

- Mobile app calendars (6b).
- Drag-to-reschedule and the availability/blackout overlay (6c).
- Staff reschedule or cancel (decided: never).
- Editing recurring series as a whole (the subscriptions page owns that).
- New booking rules: every action keeps its current backend checks (24h cutoffs,
  reschedule cap, availability, `no_double_booking`).

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Date-range booking lists (backend)** - `from` / `to`
      (`YYYY-MM-DD`, company zone, inclusive) on `GET /bookings`,
      `GET /employee/schedule`, `GET /admin/bookings`. With both present, return
      every booking whose `starts_at` is in `[from 00:00, to+1 00:00)` local, any
      status, ordered by `starts_at`, unpaginated. Span over 62 days, `to < from`,
      or an unparseable date -> 422. Without them, behaviour is unchanged. Shared
      parsing lives in one concern. *Done when:* request specs prove each endpoint
      returns only its caller's in-range bookings (customer: own; staff: own jobs
      incl. past and cancelled; admin: all, `employee_id` still filters), a
      9:30 PM Toronto booking lands on its local date, the 422 cases, and the
      unchanged paginated default.

- [x] **Step 2 - Admin booking fixes (backend)** - fix `show` to
      `BookingSerializer.render_as_hash(Booking.find(params[:id]), view: :full)`;
      remove `destroy` from the admin bookings route and controller. *Done when:*
      a spec shows `GET /admin/bookings/:id` returns 200 with the full view, and
      `DELETE /admin/bookings/:id` no longer routes (404) with the booking still
      present; no client code references the delete.

- [x] **Step 3 - Range hooks + zone-correct placement (client)** - in
      `lib/booking-time.ts`: `bookingDateKey(iso)` (company-zone `YYYY-MM-DD`) and
      `bookingLocalMinutes(iso)` (minutes after local midnight). `AppCalendar`
      buckets with `bookingDateKey`. Range hooks `useBookingsRange`,
      `useEmployeeScheduleRange`, `useAdminBookingsRange(from, to, employeeId?)`
      keyed by range, keeping previous data while the next range loads. The three
      existing month calendars switch to them (still the current month grid).
      *Done when:* each dashboard calendar shows every booking in the visible
      month (more than 25 seeded to prove it), month navigation fetches the new
      range without blanking the grid, and a 9:30 PM Toronto booking sits on its
      local day; `tsc` + lint green.

- [x] **Step 4 - View switch + Day view** - `BookingCalendar` wraps the month grid
      and adds a Month / Day switch, prev / today / next, and loading / empty /
      error states. Day is an hour grid (7 AM-10 PM) placing events by
      `bookingLocalMinutes` and duration. Month days with more than 3 bookings show
      "+N more" (opens that Day). Presentational only: bookings in, callbacks out.
      *Done when:* on a dashboard calendar the switch and navigation work, a
      booking appears at its Toronto hour in Day view, a crowded month day shows
      "+N more", and screenshots are captured; `tsc` + lint green.

- [x] **Step 5 - Week view + overlaps + narrow fallback** - add Week (7 day
      columns on the same hour grid). Overlapping events in a day share the width
      side by side. Below `sm`, Week renders as Day. *Done when:* two overlapping
      bookings show side by side in Week and Day, and a phone-width viewport shows
      Day with the switch still usable; screenshots captured.

- [x] **Step 6 - Appointment detail sheet (customer + staff)** - clicking an event
      opens a sheet with service, time, address, client or tech, status, balance,
      and actions: customer -> `RescheduleDialog` + `CancelBookingButton`
      (+ message tech); staff -> `StaffBookingActions` (charge, navigate, call).
      Successful actions refresh the calendar range. *Done when:* in the browser a
      customer reschedules and cancels from the sheet and the calendar updates
      without reload; a staff user sees Charge on a completed job and no
      reschedule or cancel.

- [x] **Step 7 - Admin actions in the sheet** - extract the admin bookings page's
      inline `renderBookingActions` into `AdminBookingActions` (reschedule,
      reassign via `ReassignControl`, status change, cancel with reason), use it on
      the bookings page (no behaviour change) and in the sheet. *Done when:* the
      admin bookings page behaves as before, and from the calendar sheet an admin
      reschedules, reassigns, and cancels, each reflected on the calendar.

- [x] **Step 8 - Create from the calendar (customer + staff)** - clicking an empty
      day (Month) or slot (Week/Day): customer ->
      `/dashboard/customer/book?date=` (existing param); staff ->
      `/dashboard/employee/new-booking?date=&time=`, which now pre-fills from
      those params. Past days and slots are not clickable. *Done when:* both flows
      open pre-filled from a clicked future slot, and a past slot does nothing.

- [x] **Step 9 - Admin manual booking page** - extract the staff new-booking form
      into a shared component; add `/dashboard/admin/bookings/new` with a required
      tech picker posting `employee_id` to the existing `POST /employee/bookings`
      (admins may target any tech); admin calendar empty slots open it pre-filled.
      *Done when:* an admin creates a booking for a chosen tech from an empty slot,
      it appears on the calendar, and a clashing time shows the 422 conflict
      message; the staff page still works.

- [x] **Step 10 - Filters + finish** - admin calendar tech filter (`employee_id`)
      and a "Show cancelled" toggle (off by default) on all three calendars;
      cancelled events render muted. List view stays the default everywhere.
      *Done when:* the filter narrows the admin calendar to one tech, the toggle
      shows/hides cancelled bookings, list view is unchanged, and `bin/ci`, full
      rspec, `npm run build` pass.

## Also built on this branch (6b, 6c)

- [x] **6b - App calendars** - a Calendar tab next to Upcoming/Past in the
      customer app (`/app/bookings`) and staff app (`/staff/schedule`):
      `MonthAgenda` month grid with status dots, tap a day to list its bookings
      with each app's existing cards, "Book this day" / "Add booking" on future
      days (`/app/book?date=`, `/staff/schedule/new?date=`, now pre-filled).
- [x] **6c - Admin tools** - `GET /admin/employees/:id/bookable_windows?from&to`
      (from `EmployeeProfile#bookable_windows_for`, spec'd); filtering the admin
      calendar to one tech shades hours outside their windows and marks days off;
      dragging a pending/confirmed booking to another slot (or month day, keeping
      its time) asks to confirm, then calls the existing admin reschedule
      endpoint (business hours, travel, double-booking still enforced).

**Evidence so far:** rspec 485/0 (new: `booking_date_range_spec`,
`admin_booking_show_spec`, `admin_bookable_windows_spec`), `bin/ci` passed,
`npm run build` green, lint clean on changed files, endpoints exercised with
curl on the dev server. **Not yet seen in a browser**: every calendar screen is
behind a login the AI cannot enter.

## Files / areas

- Backend: `app/controllers/api/v1/bookings_controller.rb`,
  `employees_controller.rb#schedule`, `admin/bookings_controller.rb`, a new
  concern (`app/controllers/concerns/booking_date_range.rb`),
  `config/routes.rb`, request specs under `spec/requests/api/v1/`.
- Client: `lib/booking-time.ts`, `lib/hooks/use-bookings.ts`, `use-employee.ts`,
  `use-admin.ts`, `components/dashboard/app-calendar.tsx`, new
  `components/dashboard/booking-calendar.tsx`, `booking-detail-sheet.tsx`,
  `admin-booking-actions.tsx`, `new-booking-form.tsx`; pages
  `dashboard/customer/bookings`, `dashboard/employee/page.tsx` + `new-booking`,
  `dashboard/admin/calendar`, `dashboard/admin/bookings` (+ `new`).

## Data / contracts

- **Load-bearing (6b and 6c reuse these):**
  - Range query: `from`, `to` = `YYYY-MM-DD` in the company zone, inclusive, max
    62-day span. Ranged response is `{ data: Booking[] }` (no `pagination`).
  - `bookingDateKey(iso)` and `bookingLocalMinutes(iso)` are the only ways to put
    a booking on a day or hour.
  - `BookingCalendar` props: `bookings`, `view`, `onViewChange`,
    `onRangeChange({ from, to })`, `onSelectBooking(booking)`,
    `onSelectSlot({ date, time? })`, `canCreateAt(date, time?)`.
- No schema change. `DELETE /admin/bookings/:id` is removed.

## Testing

- RSpec (the gate): Step 1 range behaviour per role (scoping, zone boundary,
  422s, unchanged default); Step 2 admin `show` 200 and delete no longer routed.
- UI steps (3-10): browser evidence on `bin/dev` (month/week/day screenshots,
  sheet actions, create flows, filters, a phone-width Day view) plus
  `npx tsc --noEmit`, lint on changed files, and `npm run build`. The client has
  no JS test runner; the overlap layout is proven by screenshot.
- Final: `bin/ci`, full `bundle exec rspec`.

## Notes for the AI

- Scope every list by the authenticated user (customer: `current_user.bookings`;
  staff: `profile.bookings`; admin behind `require_admin!`). Never accept a user
  or tech id from the customer or staff client.
- Parse `from`/`to` with `BusinessHours.zone`; never hand-roll UTC offsets.
- Calendar edits go through existing endpoints so the cancel/reschedule
  notifications fire unchanged. Add no new mutation routes.
- Staff must not see reschedule or cancel anywhere in this feature.
- Client: read `client/AGENTS.md`; TanStack Query, Tailwind, no `any`, no inline
  styles in new code; match the dashboard look (`#c96c83`, `#101217`, `#f4f1eb`).
- The AI cannot enter staff/admin passwords during `/check`. Admin and staff
  browser steps need the user signed in, or are proven with request specs + API
  calls; say which evidence was used.

## Also shipped in this commit (user requests on 2026-09-25)

- Detailed invoices: `details` snapshot (business, bill-to, service address,
  appointment date/time/duration, technician, add-ons, travel, overtime, HST,
  tip, payments by method, balance due), new PDF layout, email summary, full
  breakdown on the customer web receipt, app Transactions, and admin Invoices;
  GST/HST number + business address as admin settings.
- 30-minute appointment window (`Booking::ACCESS_LEAD_MIN`): customer<->tech
  messaging (both directions), live tracking, clock-in, and in-app navigation
  open 30 min before the start and close when the booking is finished; locked
  buttons explain "Your appointment window hasn't started yet"; the tech's
  clock-in reminder moves to when the window opens.
- Chat message push notifications (tap opens the thread), support replies push
  to signed-in customers, and a Support chat screen in the customer app.

**Gates:** rspec 506/0, `bin/ci` passed, `npm run build` + both mobile builds
green, lint clean on changed files.
