# Missed (tech fault) vs no-show (client fault)

Handoff brief for implementing findings **F-02**, **F-03** and **F-04** from
`blueprint/context/findings.md`. Self-contained: everything needed is below.

**Stack:** Ruby 4.0.2 / Rails 8.1 API-only, PostgreSQL + PostGIS, Solid Queue.
**Test gate:** `bundle exec rspec` must be green. Also `bin/rubocop` and
`bin/brakeman`. Note `bin/ci` does **not** run rspec; run it separately.

---

## The problem

A booking that never happens has no path through the system.

Nothing detects that an appointment start passed with no clock-in, nobody is
notified, and the model cannot express whose fault it was. Today a tech who
simply never showed up leaves a booking sitting in `confirmed` forever.

`TimeClock` has a `GRACE_MIN = 15` and a `late?` check, but it is only evaluated
**when a tech clocks in** (`app/services/time_clock.rb:79`). Nothing fires when
they never clock in at all.

## The decision (already made, do not revisit)

Add a **`missed`** status as a sibling of `no_show`:

| Status | Meaning | Who is at fault | Charge the client? |
| --- | --- | --- | --- |
| `no_show` | Client was unavailable for service | Client | Yes, `Setting.no_show_fee` |
| `missed` | Tech failed to attend | Business | **No, never** |

Chosen over an attribution field because analytics reads status directly in
several places and a second column would force a join into every one of them.

`status` is a **string enum on an indexed string column**, not a Postgres enum
type, so this needs no type alter and no table rewrite.

---

## What already exists - do NOT rebuild

The `no_show` half is fully built. Read this before writing anything.

| Thing | Location | Notes |
| --- | --- | --- |
| Write path | `app/controllers/api/v1/employees_controller.rb:116` (`mark_no_show`) | Guards against already `completed`/`cancelled` |
| Route | `config/routes.rb:155` | `POST bookings/:id/no_show` |
| Model hook | `app/models/booking.rb:64` (`after_update_commit :on_no_show`) | Fires on transition into `no_show` |
| Fee charge | `app/jobs/no_show_charge_job.rb` | Idempotent, best-effort, never raises |
| Fee setting | `app/models/setting.rb:33` (`Setting.no_show_fee`) | `0` disables |
| Notification kind | `app/models/notification.rb` (`booking_no_show`) | Already delivered by `NoShowChargeJob:42` |
| Lateness rule | `app/services/time_clock.rb:79` (`late?`), `GRACE_MIN = 15` | Reuse this constant |
| Delivery API | `NotificationService.deliver(user:, kind:, title:, body:, booking:, action_url:, metadata:)` | |

> **F-01 in the ledger is STALE.** It claims `no_show` "is never set by any code
> path." That was true when the audit ran on 2026-09-10, but `mark_no_show`
> landed on 2026-09-14 in commit `338f385`. Mark F-01 `invalid` with this
> evidence rather than implementing it. Only the three findings below are real.

---

## Scope

### F-03 - add the `missed` status

`app/models/booking.rb:23`:

```ruby
enum :status, {
  pending:     "pending",
  confirmed:   "confirmed",
  in_progress: "in_progress",
  completed:   "completed",
  cancelled:   "cancelled",
  no_show:     "no_show",   # client unavailable - chargeable
  missed:      "missed"     # tech failed to attend - never charged
}
```

Then, and this is where the bugs will be, **every place that enumerates
terminal statuses has to be reviewed**:

| Site | Current | Needs |
| --- | --- | --- |
| `booking.rb:74` `scope :past` | `%w[completed cancelled no_show]` | add `missed` |
| `booking.rb:70` `scope :active` | `in_progress` OR (`confirmed` AND `ends_at > now`) | an overdue `confirmed` booking silently leaves `active` when `ends_at` passes, which is why nothing surfaces it today |
| `employee_analytics.rb:47-56` | counts `no_show` | count `missed` separately; do **not** fold it into the tech's no-show KPI, it means the opposite |
| `admin/analytics_controller.rb:59` | `%w[completed cancelled no_show]` | add `missed` |
| `admin/analytics_controller.rb:95` | `%w[cancelled no_show]` grouped by employee | decide: `missed` is a tech-performance metric and probably belongs in its own column |

Add a write path mirroring `mark_no_show`: a `mark_missed` action plus a
`POST bookings/:id/missed` route. Decide who may call it (admin only, or the tech
too) and scope it the same way `mark_no_show` scopes through `profile.bookings`.

> **Critical:** `missed` must never trigger `NoShowChargeJob`. The existing
> `after_update_commit :on_no_show` is guarded by `if: -> { ... && no_show? }`, so
> it will not fire for `missed`. Keep it that way and add a spec asserting no
> `Payment` with `processor: "square_no_show"` is created for a `missed` booking.

### F-02 - the overdue sweep

`config/recurring.yml` currently schedules only two jobs and has **only a
`production:` block**. Add the sweep there, and consider a `development:` block
so it is exercisable locally.

New `app/jobs/overdue_booking_sweep_job.rb`:

- Find bookings `status: "confirmed"` where `starts_at + TimeClock::GRACE_MIN.minutes < Time.current`
  that have **no associated shift** (`Booking has_many :shifts`, see
  `booking.rb:9`). A tech who clocked in has a shift; one who never did has none.
- Notify the tech and an admin (`ADMIN_NOTIFY_EMAIL` is an existing env var).
- Flag for resolution. **Recommendation: do not auto-transition to `missed`.**
  Auto-charging or auto-blaming on a timer is how you punish a tech whose phone
  died. Notify, and let a human set the status. If the product wants an
  auto-transition, put it behind a `Setting` with a longer threshold than
  `GRACE_MIN`.
- Schedule every 5-15 minutes.

**Idempotency is mandatory** - this runs every few minutes over the same rows.
Follow the pattern already in `BookingReminderJob:36`:

```ruby
return if Notification.exists?(user: recipient, booking: booking, kind: spec[:kind])
```

### F-04 - the missing notifications

Add two kinds to `app/models/notification.rb`:

- `booking_starting` - at `starts_at`, nudging the tech to clock in.
- `booking_window_ended` - after `ends_at`, asking whether the job was completed.

`BookingReminderJob` already has the delivery shape, the `REMINDERS` map, the
`still_relevant?` reschedule guard and the idempotency check. Either extend it or
copy its structure. Note its early guard:

```ruby
return unless booking.status.in?(%w[confirmed in_progress])
```

---

## Conventions this codebase enforces

- **Timezones:** `starts_at`/`ends_at` are UTC; wall-clock is the company zone.
  Use `BusinessHours.zone` and `BusinessHours.parse_local`. Never hand-roll UTC
  math. See `BookingReminderJob:66` for the correct comparison idiom.
- **Services, not controllers.** Non-trivial logic goes in `app/services/`.
  Controllers stay thin.
- **Serialization** via Blueprinter (`app/serializers/*Serializer`), never raw
  model JSON.
- **Money** is `decimal`, never float.
- **Best-effort side effects** (notifications, charges) must never break the core
  request. `NoShowChargeJob` is the reference: log and move on, never raise.
- **Scope by the authenticated user.** Never trust a client-supplied user id.
- **Migrations:** standard Rails; keep `db/schema.rb` in sync. `db/seeds.rb` runs
  on every deploy, so seed writes must be idempotent.
- **No em dashes** in code comments, docs or commit messages.
- **Comment the why, not the what.** This codebase comments sparingly and well;
  match it. Do not add banner blocks or narrate obvious code.

## Tests required

`bundle exec rspec` is the gate. A step adding logic ships a passing spec in the
same diff.

- `spec/models/booking_spec.rb` - `missed` is a valid status; it appears in
  `past`; it does **not** fire `NoShowChargeJob`.
- `spec/jobs/overdue_booking_sweep_job_spec.rb` - finds a `confirmed` booking
  past grace with no shift; ignores one that has a shift; ignores one still
  inside grace; **notifies only once across repeated runs**.
- `spec/requests/api/v1/...` - `POST bookings/:id/missed` returns the serialized
  booking, forbids a non-owner, and rejects an already `completed` booking.
- Notification specs for the two new kinds, including the idempotency guard.
- Check `spec/jobs/no_show_charge_job_spec.rb` and
  `spec/requests/api/v1/employee_earnings_spec.rb` still pass: both touch the
  status enum and analytics counts.

External services (Square, Helcim) are stubbed in specs. No live calls.

## Verify before handing back

```bash
bundle exec rspec
bin/rubocop
bin/brakeman --no-pager
```

## Open product questions

Answer these with the owner before or during implementation:

1. Who may set `missed` - admin only, or the tech self-reporting?
2. Does a `missed` booking auto-offer the customer a reschedule or a credit?
3. Should `missed` count against the tech in `employee_analytics`, and is that
   surfaced to the tech or only to admins?
4. Is there a threshold at which the sweep auto-transitions, or is it always a
   human decision?
