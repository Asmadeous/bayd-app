# Feature: 1a - Bookable-hours schedule model

**From build-plan:** feature 1a (under 1. Custom availability engine + drop SimplyBook)
**Status:** not started

## Goal

Give each technician an owned, in-house definition of *when a customer can book
them* — a weekly recurring template plus date-specific overrides — so we can stop
asking SimplyBook for a provider's working schedule. This is the data foundation
the `AvailabilityEngine` (1b) computes free slots from. This feature is a **pure
addition**: it creates models + endpoints and removes nothing. No availability
logic and no SimplyBook removal happen here.

## In scope

- Two new models: `AvailabilitySchedule` (weekly template) and
  `AvailabilityOverride` (date-specific), both `belongs_to :employee_profile`.
- Migrations + `db/schema.rb` update.
- Associations on `EmployeeProfile`.
- Validations (valid day/time ranges, start < end, no absurd rows).
- CRUD endpoints so a tech manages their own schedule and an admin manages anyone's.
- Serializers for both.
- Specs for models (validations) and requests (auth scoping + CRUD contract).

## Out of scope (deferred)

- **1b** — computing free slots from these models (the `AvailabilityEngine`).
- **1c** — wiring anything into `AvailabilityController` / `AssignmentService`.
- **1d** — removing SimplyBook.
- A schedule-editing UI in the web/mobile client (endpoints only here; mobile
  availability editing is Phase 4).
- Seeding real schedules for the 4 live techs (do once 1b/1c make it meaningful).

## Build loop

Build one step at a time. Show the diff, explain it, get approval, optional
checkpoint commit, move on. Never a step whose diff is too big to read.

## Build steps

- [ ] **Step 1 - AvailabilitySchedule model + migration** — create
      `availability_schedules` (`employee_profile_id`, `day_of_week` int 0-6,
      `start_time` time, `end_time` time, timestamps; index on
      `[employee_profile_id, day_of_week]`). Model with `belongs_to`, validations
      (`day_of_week` 0..6; `start_time`/`end_time` present; `end_time` after
      `start_time`), `has_many` on `EmployeeProfile`. *Done when:* migration runs,
      `bin/rails runner` can create a valid row and validation rejects a bad one;
      model spec green.
- [ ] **Step 2 - AvailabilityOverride model + migration** — create
      `availability_overrides` (`employee_profile_id`, `date` date, `available`
      bool default true, `start_time` time null, `end_time` time null, timestamps;
      unique index on `[employee_profile_id, date]` — one override row per tech per
      day). Model with `belongs_to`, validations (when `available` and times given,
      `end_time` after `start_time`; a blackout may omit times), `has_many` on
      `EmployeeProfile`. *Done when:* migration runs; a blackout override and a
      partial-day override both save; duplicate (tech,date) rejected; model spec green.
- [ ] **Step 3 - Serializers** — `AvailabilityScheduleSerializer` and
      `AvailabilityOverrideSerializer` (Blueprinter), exposing the fields above.
      *Done when:* serializers render the expected hash shape (covered via the
      request specs in step 4/5).
- [ ] **Step 4 - Tech self-serve endpoints** — nested under the current staff
      user's own profile: list / create / update / destroy their
      `availability_schedules` and `availability_overrides`. Scope strictly to the
      authenticated employee's own profile (never a client-supplied
      `employee_profile_id`). *Done when:* a staff user CRUDs their own rows; a
      staff user cannot touch another tech's rows (403/404); request spec green.
- [ ] **Step 5 - Admin endpoints** — admin can list/create/update/destroy any
      tech's schedules + overrides (namespaced under `admin`, admin-authorized).
      *Done when:* an admin manages another tech's rows; a non-admin is rejected;
      request spec green.

## Files / areas

- `db/migrate/*_create_availability_schedules.rb`, `*_create_availability_overrides.rb`
- `app/models/availability_schedule.rb`, `app/models/availability_override.rb`
- `app/models/employee_profile.rb` (add two `has_many`)
- `app/serializers/availability_schedule_serializer.rb`,
  `app/serializers/availability_override_serializer.rb`
- Controllers: staff-facing (e.g. `app/controllers/api/v1/availabilities_controller.rb`
  or under the existing staff/profile namespace — match how staff endpoints are
  organized today) + `app/controllers/api/v1/admin/…`
- `config/routes.rb`
- Specs: `spec/models/…`, `spec/requests/api/v1/…`

## Data / contracts

**AvailabilitySchedule** (LOAD-BEARING — 1b/1c and mobile editing depend on it):
- `employee_profile_id` (bigint, fk)
- `day_of_week` (integer, 0=Sunday … 6=Saturday)
- `start_time` / `end_time` (time-of-day, interpreted in `BusinessHours.zone`)
- multiple rows per (tech, day) allowed → split shifts
- index `[employee_profile_id, day_of_week]`

**AvailabilityOverride** (LOAD-BEARING):
- `employee_profile_id` (bigint, fk)
- `date` (date)
- `available` (boolean, default true) — true = extra hours that date; false = blackout
- `start_time` / `end_time` (time, nullable) — partial-day; null on a full blackout
- **unique** `[employee_profile_id, date]` — one override per tech per day; it wins
  over the weekly template for that date (the *winning logic* lives in 1b, but the
  one-row-per-day shape is locked here)

> Times are stored as time-of-day and always interpreted in `BusinessHours.zone`
> (company timezone), consistent with how bookings use `BusinessHours`. Do NOT
> store these as UTC instants.

## Testing

`bundle exec rspec` is the gate (declared in AGENTS.md), so logic-bearing steps
ship a spec in the same diff.

- **Model specs (in-scope logic):** `day_of_week` range; `end_time` after
  `start_time`; override uniqueness per (tech, date); blackout-with-no-times valid;
  partial override with bad times invalid.
- **Request specs (contract + auth scoping):** staff CRUD their own rows; staff
  blocked from another tech's rows; admin CRUD any tech's rows; non-admin blocked
  from admin routes. This is the load-bearing part — auth scoping must be proven.
- Keep `bin/rubocop` and `bin/brakeman` clean.

## Notes for the AI

- **Match existing conventions (verified):**
  - Staff endpoints gate with `before_action :require_employee!` (defined in
    `ApplicationController`) and resolve the profile as
    `current_user.employee_profile` — mirror
    `app/controllers/api/v1/employees_controller.rb` (see its `@profile ||=
    current_user.employee_profile || raise(ActiveRecord::RecordNotFound)` at ~:225).
  - Admin endpoints inherit from `Api::V1::Admin::BaseController` (which already
    runs `before_action :require_admin!`) — put admin routes under `app/controllers/
    api/v1/admin/` like the other admin controllers.
  - Blueprinter serializers, `rescue_from` status mapping, rubocop-rails-omakase.
- **Auth scoping is the main risk:** a staff endpoint must derive the profile from
  `current_user.employee_profile`, never from a params `employee_profile_id`.
  Prove it in specs (staff A cannot read/write staff B's rows).
- **No availability computation here.** If tempted to add "is this tech free at
  X" logic, stop — that's 1b. This feature only stores and serves the schedule.
- **Times, not datetimes.** `start_time`/`end_time` are time-of-day; the zone is
  applied by the engine later via `BusinessHours`.
- Don't touch SimplyBook code or the `simplybook_*` columns — that's 1d.
