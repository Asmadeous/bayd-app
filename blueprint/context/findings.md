# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P1] invalid - `no_show` status is never set by any code path

**File:** app/models/booking.rb:29
**Found:** 2026-09-10 by /audit (scope: current; lens: quality)
**Why it matters:** `no_show` is a defined booking status, but a search across
`app/` shows it is only ever *read* (`employee_analytics.rb:47`,
`admin/analytics_controller.rb:59,95`) and never *written*. No controller, job,
or model transition assigns it. Analytics that count no-shows will always report
zero, and there is no way for staff/admin to record that a client was unavailable
for service. This is the "client didn't show" side of the lifecycle the user
called out (missed vs no_show), and it is currently unreachable.
**Suggested fix:** Add an explicit transition (staff/admin action on
`in_progress`/`confirmed` -> `no_show`, with a reason), distinct from a
tech-fault "missed". Decide the status model with the user first (see F-03).
**Resolution:** INVALID (stale). This was true on 2026-09-10 but `mark_no_show`
landed 2026-09-14 (`employees_controller.rb:116`, route `routes.rb:155`), and
the `on_no_show` model hook (`booking.rb:64`) fires `NoShowChargeJob`. `no_show`
IS written and charged. No implementation needed.

### F-02 [P1] fixed - No scheduled sweep detects overdue bookings or missed clock-ins

**File:** config/recurring.yml:14
**Found:** 2026-09-10 by /audit (scope: current; lens: correctness)
**Why it matters:** `recurring.yml` schedules only `clear_solid_queue_finished_jobs`
and `subscription_scheduler`. There is no periodic job that looks at bookings
whose `starts_at`/`ends_at` has passed without a clock-in. `TimeClock` defines
`GRACE_MIN = 15` and a "late" concept, but "late" is only computed *when a tech
clocks in* (`time_clock.rb:70`); nothing fires when they never clock in at all.
Consequently no one is notified of a missed appointment, and an overdue booking
never transitions out of `confirmed` on its own. This is the root cause behind
the user's "why were we not notified of missed clock in and booking" report.
**Suggested fix:** Add a recurring sweep (e.g. every 5-15 min) that finds
`confirmed` bookings past `starts_at + grace` with no clock-in shift, notifies
the tech + admin, and flags them for resolution. Pair with F-01/F-03 for the
status outcome.
**Resolution:** Fixed 2026-09-20 - `OverdueBookingSweepJob` finds `confirmed`
bookings past `starts_at + TimeClock::GRACE_MIN` with no shift
(`where.missing(:shifts)`), notifies tech + admins (`booking_overdue`), does NOT
auto-transition, and is idempotent per (recipient, booking). Scheduled every 10
min in `recurring.yml` (production + development). Specs in
`spec/jobs/overdue_booking_sweep_job_spec.rb`.

### F-03 [P1] fixed - Missed (tech fault) and no_show (client fault) are conflated with no resolution flow

**File:** app/models/booking.rb:23
**Found:** 2026-09-10 by /audit (scope: current; lens: quality)
**Why it matters:** The status enum has `no_show` but no `missed` (or equivalent)
concept, so a booking a tech failed to attend and a booking where the client was
unavailable cannot be distinguished. There is also no resolution path (reschedule,
waive, charge cancellation, mark client no_show) once a booking goes stale. The
user explicitly asked how the system differentiates a missed booking (tech's
fault) from a no_show (client's fault); today it cannot. This is a product-model
decision, not a mechanical fix.
**Suggested fix:** Confirm the status model with the user: e.g. add a `missed`
status (or a `missed_reason`/attribution field) alongside `no_show`, define who
can set each, and add a resolution action. Blocks F-01 and F-02 from being
implemented correctly.
**Resolution:** Fixed 2026-09-20 - added `missed` status to the `Booking` enum
(never charged; `on_missed` hook fires `BookingMissedJob`, not `NoShowChargeJob`).
Write path `mark_missed` (tech self-report via `profile.bookings`; admins via
`Admin::BookingsController#update`), route `POST bookings/:id/missed`. All
terminal-status call sites updated: `:past` scope, `EmployeeAnalytics#summary`
(missed counted separately, out of completion-rate), and admin analytics
(`finished` denominator + a separate `missed` leaderboard column). Customer remedy:
`BookingMissedJob` notifies + offers reschedule. Specs in `spec/models/booking_spec.rb`,
`spec/jobs/booking_missed_job_spec.rb`, `spec/requests/api/v1/employee_mark_missed_spec.rb`.

### F-04 [P1] fixed - No post-appointment / appointment-start notification

**File:** app/jobs/booking_reminder_job.rb:13
**Found:** 2026-09-10 by /audit (scope: current; lens: quality)
**Why it matters:** Notification kinds cover `booking_confirmed`,
`booking_reminder_day_before`, `booking_reminder_day_of`, and `booking_dispatch`,
but there is no notification at appointment start (prompting the tech to clock in)
and none after the window ends (prompting completion / flagging a no-show). The
gap is why a missed start goes unnoticed. Depends on F-02's sweep to have a
trigger.
**Suggested fix:** Add an at-start "time to clock in" nudge and an
after-window "was this completed?" prompt, wired through the F-02 sweep and the
existing `NotificationService`.
**Resolution:** Fixed 2026-09-20 - added `booking_starting` (at `starts_at`,
nudges the tech to clock in) and `booking_window_ended` (at `ends_at`, prompts
completion) notification kinds, scheduled via `BookingReminders` and delivered by
`BookingReminderJob` (same idempotency + `still_relevant?` reschedule guard as the
existing reminders; staff audience -> `/staff/schedule`). Also added
`booking_overdue` (sweep) and `booking_missed` (customer) kinds. Specs cover the
new kinds' delivery + idempotency.

### F-05 [P3] fixed - rubocop scans vendored + generated files (48 offenses, none in our source)

**File:** .rubocop.yml:2
**Found:** 2026-09-10 by /audit (scope: current; lens: quality)
**Why it matters:** `bin/rubocop` reports 48 offenses, but every one is in
`client/node_modules/**` or generated iOS Cordova podspecs
(`client/ios*/capacitor-cordova-ios-plugins/*.podspec`), not our source. `app/`,
`lib/`, `config/`, and `spec/` are clean. `.rubocop.yml` inherits omakase with no
`AllCops: Exclude`, so it lints third-party/generated Ruby. This made `bin/ci`
fail on every run - a deploy-gate blocker.
**Suggested fix:** Add `AllCops: Exclude: ['client/**/*']` to `.rubocop.yml`.
**Resolution:** Fixed 2026-09-14 - added `AllCops: Exclude: ["client/**/*"]` to
`.rubocop.yml`. `bin/ci` now passes (rubocop clean, bundler-audit + brakeman green).
