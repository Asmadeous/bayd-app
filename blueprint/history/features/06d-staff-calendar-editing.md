# Feature: Staff calendar editing

**From build-plan:** feature 6d
**Status:** complete

## Goal

Techs manage their own appointments from the staff app day view: tap an empty
hour to book it, reschedule or cancel from the job page, and long-press-drag a
job to a new time. Every action guides them: what will happen, who is told, and
what to do when the app says no. Reverses the 6 rule "staff view + existing
actions only" (user decision 2026-09-27).

## In scope

- `POST /api/v1/employee/bookings/:id/reschedule` - own bookings only
  (`profile.bookings`), `starts_at` (local wall-clock), via
  `Booking#reschedule!(by_customer: false)`; never changes the tech. No
  customer 24h cutoff or 2-reschedule cap (those are customer rules).
- `POST /api/v1/employee/bookings/:id/cancel` - own bookings only, pending or
  confirmed, `reason` required. Sets `cancelled` + `cancellation_reason`; the
  existing `BookingCancelledJob` tells the customer and tech; every admin also
  gets a `booking_cancelled` notification naming the tech and reason (refunds
  stay with the office).
- Plain-language errors with a next step for every refusal (see Contracts).
- Job page: Reschedule sheet (date strip + this tech's open slots from
  `/availability`, plus "Other time" like staff booking) and Cancel sheet
  (reason picker + note, states who is told and that any payment refund is
  handled by the office).
- Day view: tap an empty hour -> New booking with `?date=&time=` pre-filled;
  `BookingFlow` reads `?time=`.
- Day view: long-press (~400ms) a job block, drag, drop snaps to 15 min; a
  confirm says "Move <client> from <old> to <new>? <client> is told." then calls
  reschedule; the block snaps back on cancel or error.
- Guidance: a dismissible first-use hint on the day view ("Tap an empty time to
  book it. Press and hold a job to move it. Tap a job for more options."),
  remembered per device (localStorage, try/catch).

## Out of scope

- Reassigning a job to another tech (admin only).
- The web staff dashboard (`/dashboard/employee`) calendar; app only here.
- Automatic refunds on cancel.
- Drag on the month view or across days (day view, same day only; use the
  Reschedule sheet for another day).

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Staff reschedule + cancel endpoints** - routes, controller
  actions, error mapping, admin cancel notification, request specs. *Done when:*
  specs prove own-booking success, another tech's booking -> 404, each refusal
  returns its plain message and status, cancel without a reason -> 422, admins
  are notified on cancel, and the tech is never changed by reschedule.
- [x] **Step 2 - Reschedule from the job page** - `useStaffReschedule` hook +
  Reschedule sheet on the staff job page with guidance copy. *Done when:* tsc +
  lint clean; in the running app a local test job moves to a picked slot and a
  refused time shows the plain message.
- [x] **Step 3 - Cancel from the job page** - `useStaffCancel` hook + Cancel
  sheet (reason required, says who is told). *Done when:* tsc + lint clean; a
  local test job cancels in the running app and shows as cancelled.
- [x] **Step 4 - Tap an empty hour to book + first-use hint** - `DayTimeline`
  `onSlot(time)`, day view routes to New booking with date + time, `BookingFlow`
  reads `?time=`, hint card. *Done when:* tapping 2 PM on a future day opens the
  form with that date and 2:00 PM selected; the hint shows once and stays
  dismissed.
- [x] **Step 5 - Long-press drag to move** - `DayTimeline` `onMove(booking,
  newStart)` with long-press, 15-min snap, confirm, reschedule, snap-back on
  cancel/error. Page scroll still works on a normal swipe. *Done when:* in the
  running app a job dragged to a new time moves after confirming, and a
  refused drop snaps back with the plain message.

## Files / areas

- `config/routes.rb`, `app/controllers/api/v1/employees_controller.rb` (server)
- `spec/requests/api/v1/employee_booking_edits_spec.rb` (new)
- `client/lib/hooks/use-employee.ts`
- `client/app/staff/schedule/job/page.tsx`, `client/app/staff/staff-booking-card.tsx`,
  new staff reschedule/cancel sheet components under `client/app/staff/schedule/`
- `client/app/staff/schedule/day/page.tsx`, `client/components/calendar/day-timeline.tsx`
- `client/app/book/page.tsx` (`?time=` prefill only)

## Data / contracts

- No migration.
- `POST /employee/bookings/:id/reschedule` `{ starts_at: "YYYY-MM-DDTHH:MM:00" }`
  -> 200 full `Booking`; errors `{ error, code }`:
  - `slot_taken` (409): "You already have a job then. Pick another time, or move that job first."
  - `outside_hours` (422): "That time is outside business hours. Pick a time the business is open."
  - `not_reachable` (422): "You couldn't travel there in time from your job before or after. Leave more room between jobs."
  - `not_reschedulable` (422): "This job is <status> and can't be moved."
- `POST /employee/bookings/:id/cancel` `{ reason }` -> 200 full `Booking`;
  422 "Choose a reason so the client and office know why." when blank;
  422 "This job is <status> and can't be cancelled." when not pending/confirmed.
- `DayTimeline` gains optional `onSlot?: (time: "HH:MM") => void` and
  `onMove?: (booking, newStart: "HH:MM") => Promise<void>`; callers without them
  behave as today (customer app unchanged).

## Testing

- RSpec gate for step 1 (request specs; reuse `Booking#reschedule!`, so no new
  model logic).
- Steps 2-5 are UI: tsc + lint clean plus a run in the browser against a local
  test booking, deleted afterwards.
- `bin/rubocop`, `bin/brakeman` clean; full `bundle exec rspec` before `/complete`.

## Notes for the AI

- Scope everything through `profile.bookings` (404 for another tech's booking).
- Times are company wall-clock: `BusinessHours.parse_local`; never hand-roll UTC.
- The double-booking guard is the Postgres constraint; `reschedule!` already
  maps it to `slot_taken`.
- Staff app is purpose-built mobile UI (see staff-theme); match existing sheets.
- No em dashes in copy, comments, or specs.
