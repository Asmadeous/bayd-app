# Feature: Missed (tech fault) vs no-show (client fault) - F-02, F-03, F-04

**Type:** Fix (implements three open findings from `blueprint/context/findings.md`)
**Status:** completed 2026-09-20 (branch `fix/missed-vs-noshow`)
**Gates:** rspec 422 ex / 0 failures, rubocop clean, brakeman 0 warnings, client
tsc clean, eslint clean (changed files), `npm run build` green.

## Goal

A booking that never happens has no path through the system. Nothing detects an
appointment start that passed with no clock-in, nobody is notified, and the model
cannot express whose fault it was. Add a `missed` status (tech fault, never
charged) as a sibling of `no_show` (client fault, charged), a recurring sweep that
flags overdue bookings, and the two missing lifecycle notifications.

`no_show` is already fully built - do not rebuild it. This adds the `missed`
half, the sweep, and the notifications.

## Decisions (locked - do not revisit)

- **`missed` = tech failed to attend; NEVER charged.** `no_show` = client
  unavailable; charged `Setting.no_show_fee`.
- **`missed` is a string enum value** on the existing indexed string `status`
  column - no Postgres type alter, no table rewrite.
- **Who may set `missed`:** admin AND the assigned tech (self-report allowed).
- **Overdue sweep:** notify tech + admin and flag; do NOT auto-transition to
  `missed`. A human sets the final status.
- **`missed` customer remedy:** on transition to `missed`, auto-notify the
  customer and offer a reschedule.
- **`missed` must NEVER fire `NoShowChargeJob`.** The `on_no_show` hook is guarded
  `if: saved_change_to_status? && no_show?`, so it won't fire for `missed`. Keep it.

## Findings addressed

- **F-01** - STALE, mark `invalid`. It claims `no_show` is never written, but
  `mark_no_show` landed 2026-09-14 (`employees_controller.rb:116`). Not implemented.
- **F-02** - overdue sweep (new recurring job).
- **F-03** - the `missed` status + all terminal-status call sites + write path.
- **F-04** - `booking_starting` + `booking_window_ended` notifications.

## Build steps

- [x] **Step 1 - `missed` status + terminal-status call sites (F-03 model half)** -
      Add `missed: "missed"` to the `Booking` status enum (`booking.rb:23`). Then
      fix EVERY place that enumerates terminal statuses:
      - `scope :past` (`booking.rb:74`): add `missed`.
      - `scope :active` (`booking.rb:70`): unchanged (an overdue confirmed booking
        correctly leaves `active` when `ends_at` passes - that's how the sweep
        finds it; documented, not a bug to fix here).
      - `employee_analytics.rb`: count `missed` SEPARATELY, never folded into the
        tech's no-show KPI (opposite meaning).
      - `admin/analytics_controller.rb:59`: add `missed` to the terminal list.
      - `admin/analytics_controller.rb:95`: `missed` is a tech-performance metric -
        its own column, not merged with cancelled/no_show.
      *Done when:* `missed` is a valid status, appears in `:past`, analytics count
      it separately; a spec asserts a `missed` booking creates NO
      `processor: "square_no_show"` payment; rspec + rubocop green.

- [x] **Step 2 - `mark_missed` write path (F-03 controller half)** -
      `mark_missed` action on `employees_controller` mirroring `mark_no_show`
      (guards already `completed`/`cancelled`, scopes through `profile.bookings`),
      plus an admin path. Route `POST bookings/:id/missed`. On transition to
      `missed`, an `after_update_commit :on_missed` hook (guarded
      `saved_change_to_status? && missed?`) auto-notifies the customer with a
      reschedule offer (best-effort, never raises).
      *Done when:* `POST bookings/:id/missed` returns the serialized booking; a
      non-owner tech is forbidden; an already-`completed` booking is rejected; the
      customer gets a `booking_missed` notification; rspec + rubocop green.

- [x] **Step 3 - overdue sweep (F-02)** - `OverdueBookingSweepJob`: find
      `status: "confirmed"` bookings where `starts_at + TimeClock::GRACE_MIN.minutes
      < Time.current` with NO associated shift (`booking.shifts.empty?` = never
      clocked in). Notify the tech + an admin (`ADMIN_NOTIFY_EMAIL`). Do NOT
      auto-transition. Idempotent: skip if a notification of this kind already
      exists for `(user, booking)` (mirror `BookingReminderJob:34`). Schedule every
      10 min in `recurring.yml`; add a `development:` block so it's exercisable
      locally.
      *Done when:* the job flags a confirmed booking past grace with no shift;
      ignores one WITH a shift; ignores one still inside grace; notifies ONLY ONCE
      across repeated runs; rspec + rubocop green.

- [x] **Step 4 - lifecycle notifications (F-04)** - add notification kinds
      `booking_starting` (nudge tech to clock in) and `booking_window_ended` (ask
      if the job was done), plus `booking_missed` (customer remedy from Step 2).
      Deliver `booking_starting`/`booking_window_ended` by extending
      `BookingReminderJob`'s REMINDERS map + scheduling (same delivery shape,
      idempotency, `still_relevant?` guard, `BusinessHours` idiom).
      *Done when:* the two kinds exist and are delivered idempotently; specs assert
      each kind + the idempotency guard; rspec + rubocop green.

## Files / areas

- `app/models/booking.rb` (enum, `:past` scope, `on_missed` hook)
- `app/controllers/api/v1/employees_controller.rb` (`mark_missed`)
- `app/controllers/api/v1/admin/bookings_controller.rb` (admin `missed` path)
- `config/routes.rb` (`missed` route)
- `app/services/employee_analytics.rb` (count `missed` separately)
- `app/controllers/api/v1/admin/analytics_controller.rb` (terminal lists)
- `app/jobs/overdue_booking_sweep_job.rb` (NEW)
- `config/recurring.yml` (schedule sweep; add dev block)
- `app/models/notification.rb` (new kinds)
- `app/jobs/booking_reminder_job.rb` (deliver new kinds)
- Specs: `spec/models/booking_spec.rb`, `spec/jobs/overdue_booking_sweep_job_spec.rb`,
  `spec/requests/api/v1/...`, notification specs. Keep
  `spec/jobs/no_show_charge_job_spec.rb` + `spec/requests/api/v1/employee_earnings_spec.rb` green.

## Conventions

- Timezones: `starts_at`/`ends_at` UTC; use `BusinessHours.zone` /
  `BusinessHours.parse_local`, never hand-roll UTC math (see
  `BookingReminderJob:62`).
- Services not controllers for non-trivial logic; controllers thin.
- Blueprinter serialization, never raw model JSON.
- Money is `decimal`.
- Best-effort side effects (notifications, charges) never break the core request
  or raise (`NoShowChargeJob` is the reference).
- Scope by the authenticated user; never trust a client-supplied id.
- Idempotent seeds/jobs. No em dashes. Comment the why, not the what.

## Testing

`bundle exec rspec` is the gate; `bin/rubocop` + `bin/brakeman` clean.

- `missed` is valid; appears in `:past`; fires NO `NoShowChargeJob`
  (no `processor: "square_no_show"` payment).
- Sweep: finds confirmed-past-grace-no-shift; ignores has-shift; ignores
  in-grace; notifies once across runs.
- `POST bookings/:id/missed`: serialized booking; forbids non-owner; rejects
  already-completed; customer gets `booking_missed`.
- New notification kinds deliver idempotently.
- External services (Square/Helcim) stubbed; no live calls.
