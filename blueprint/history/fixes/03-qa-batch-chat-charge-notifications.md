# Fix: QA batch - guest support chat, action-named notifications, multi-method charge, Rim on the team, repeat-booking dropdown

**Type:** Fix
**Status:** completed 2026-09-24 (branch `fix/qa-batch-chat-charge-notifications`)
**Gates:** `bin/ci` passed, rspec 474 ex / 0 failures, client tsc + lint (changed files) + `npm run build` green.

## The problem

Six tester/owner reports from 2026-09-24:

1. **No support chat on the website.** Visitors (no account) have no way to ask a
   question in real time. Existing `Conversation` is user-to-user and JWT-only.
2. **"No cancel option" for customers.** Already built in #100: web
   `/dashboard/customer/bookings` and app `/app/bookings`. Gaps: the web dashboard
   home's upcoming cards have no actions, and the web button ignores the 24h
   cutoff (shows, then the API rejects it).
3. **Notifications are not named by action.** Cancelling sends nothing at all; a
   customer no-show only notifies when a fee was charged ("No-show fee charged");
   titles mix styles; the detail sheet shows raw kinds (`booking no show`).
4. **Staff can only charge by Square card.** We also accept Interac e-Transfer,
   cash, and cheque (site footer). The desktop staff dashboard has no charge
   button at all.
5. **Website team still shows Dana** (replaced by Rim). `/services` appends a
   static, invented Facials list on top of the real seeded Facials category, so
   facials show twice and with wrong prices.
6. **Repeat-booking field on the payment step** is a free number box plus a
   week/month toggle; the site's subscription page uses a frequency dropdown.

## The fix

| # | Change |
| --- | --- |
| 1 | New `SupportThread` + `SupportMessage`. Public token-scoped endpoints (visitor gets an unguessable token, stored in localStorage), rate-limited. Admin inbox at `/dashboard/admin/support`. Floating chat bubble on public site pages. Polling, no ActionCable for guests. Admins notified on new thread and on visitor reply. |
| 2 | Shared `CancelBookingButton` (24h rule + hint) used on the bookings page and dashboard home. |
| 3 | `booking_cancelled` kind + callback notifying customer and tech; no-show always notifies ("You missed your appointment"); consistent action titles; friendly kind labels in the UI. |
| 4 | Card: the tech enters the client's card in Square's form on their own device (desktop opens it in a new tab; the link is never sent to the client). `POST /employee/bookings/:id/record_payment` (cash / interac / cheque) marks paid with the method. `Payment` method enum gains `interac`, `cheque`. Staff app card + desktop staff dashboard get one **Charge** button: pick method, card opens Square checkout, others mark paid. Paid method shown on the booking. |
| 5 | Team section: Dana out, Rim in. Serializer Dana photo case removed. Facials added to live pricing meta; static facials list only used as the offline fallback and rewritten to match the seed. |
| 6 | Payment-step repeat field becomes a dropdown of `FREQUENCY_PRESETS`. |

**Must not break:** Square hosted checkout (`payment_link`), `no_double_booking`,
existing notification idempotency guards, seeds idempotency.

## Build steps

- [x] **Step 1 - Notifications** - cancel/no-show/titles/labels + specs.
- [x] **Step 2 - Multi-method charge** - backend endpoint + spec, staff app + desktop UI.
- [x] **Step 3 - Cancel UX** - shared button on web dashboard home + bookings page.
- [x] **Step 4 - Guest support chat** - migration, models, public + admin API, specs, bubble, admin inbox.
- [x] **Step 5 - Team + services** - Rim on the team, facials from the seed; check with foreman.
- [x] **Step 6 - Repeat dropdown** on the booking payment step.

## Verify

- `bundle exec rspec` green; `bin/rubocop`, `bin/brakeman` clean.
- `client/`: `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
- `foreman start -f Procfile.dev`: home + `/services` show Rim and one Facials
  section matching `db/seeds.rb`; chat bubble works as a guest and the admin
  can reply; booking payment step shows the repeat dropdown.

## Findings

Carried forward from `01-missed-vs-noshow` (resolved there, closed here).

#### 03-qa-batch-chat-charge-notifications/F-01 [P1] invalid - `no_show` status is never set by any code path

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

#### 03-qa-batch-chat-charge-notifications/F-02 [P1] closed - No scheduled sweep detects overdue bookings or missed clock-ins

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
**Closed:** 2026-09-24 by re-examination during /complete of the QA batch fix: `OverdueBookingSweepJob` present with `where.missing(:shifts)` and `TimeClock::GRACE_MIN` cutoff; scheduled in `config/recurring.yml`. Specs `overdue_booking_sweep_job_spec`, `booking_missed_job_spec`, `employee_mark_missed_spec`, `booking_reminder_job_spec`, `booking_spec`: 25 examples, 0 failures.


#### 03-qa-batch-chat-charge-notifications/F-03 [P1] closed - Missed (tech fault) and no_show (client fault) are conflated with no resolution flow

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
**Closed:** 2026-09-24 by re-examination during /complete of the QA batch fix: `missed` status in `Booking` enum, `on_missed` hook to `BookingMissedJob`, `mark_missed` scoped to `profile.bookings`, route `POST bookings/:id/missed`, `:past` scope includes `missed`. Specs `overdue_booking_sweep_job_spec`, `booking_missed_job_spec`, `employee_mark_missed_spec`, `booking_reminder_job_spec`, `booking_spec`: 25 examples, 0 failures.


#### 03-qa-batch-chat-charge-notifications/F-04 [P1] closed - No post-appointment / appointment-start notification

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
**Closed:** 2026-09-24 by re-examination during /complete of the QA batch fix: `BookingReminders` enqueues `starting` at `starts_at` and `window_ended` at `ends_at`. Specs `overdue_booking_sweep_job_spec`, `booking_missed_job_spec`, `employee_mark_missed_spec`, `booking_reminder_job_spec`, `booking_spec`: 25 examples, 0 failures.


#### 03-qa-batch-chat-charge-notifications/F-05 [P3] closed - rubocop scans vendored + generated files (48 offenses, none in our source)

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
**Closed:** 2026-09-24 by re-examination during /complete of the QA batch fix: `.rubocop.yml` excludes `client/**/*`; `bin/ci` green. Specs `overdue_booking_sweep_job_spec`, `booking_missed_job_spec`, `employee_mark_missed_spec`, `booking_reminder_job_spec`, `booking_spec`: 25 examples, 0 failures.
