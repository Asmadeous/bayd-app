# Feature: Visit + planner

**From build-plan:** feature 9a
**Status:** complete

## Goal

Lay the backend foundation for multi-service bookings: a `Visit` that groups one
booking per service, and a `VisitPlanner` that finds the times when every chosen
service has a tech (one tech for the whole visit when possible, else split
back-to-back across the nearest eligible techs). Exposed as
`GET /availability/visit` so the booking flow can show combined times.

## In scope

- `visits` table + `Visit` model; `bookings.visit_id` + `bookings.visit_position`.
- `BusinessHours.open_for?(starts_at, ends_at)` shared operating-hours check.
- `VisitPlanner`: open start times for a date, and the exact plan (tech + window
  per line) at a given start, with techs to exclude (for 9b's race fallback).
- `GET /api/v1/availability/visit` (public, like the other availability routes).

## Out of scope

- Creating visits/bookings (9b), any UI (9c/9d), reschedule/cancel (9e),
  group deposits and subscriptions on visits (9f). Party size is accepted here
  only because it scales each line's duration.

## Build steps

- [x] **Step 1 - Visit schema + model** - migration (`visits`, `bookings.visit_id`,
  `bookings.visit_position`), `Visit` model (associations, ordered lines, computed
  status / totals), `Booking belongs_to :visit, optional`. *Done when:* migration
  runs, `db/schema.rb` updated, model spec green.
- [x] **Step 2 - VisitPlanner** - single-tech-first, else back-to-back split;
  coverage, bookable hours, existing bookings, travel feasibility, operating
  hours, past-time filter; `slots` and `plan_at(start, exclude_employee_ids:)`.
  *Done when:* service spec covers single tech, split, no-plan, exclusions,
  coverage, and party size, all green.
- [x] **Step 3 - `GET /availability/visit`** - controller action + route,
  `next_available_date` when the day is empty. *Done when:* request spec green;
  rubocop + brakeman clean; full rspec green.

## Files / areas

- `db/migrate/*_create_visits.rb`, `db/schema.rb`
- `app/models/visit.rb`, `app/models/booking.rb`
- `app/services/business_hours.rb`, `app/services/visit_planner.rb`
- `app/controllers/api/v1/availability_controller.rb`, `config/routes.rb`
- `spec/models/visit_spec.rb`, `spec/services/visit_planner_spec.rb`,
  `spec/requests/api/v1/availability_visit_spec.rb`

## Data / contracts (load-bearing)

`visits`: `user_id` (req), `address_id`, `client_type` (default adult),
`party_size` (default 1), `payment_timing` (default pay_after), `booked_for_name`,
`booked_for_phone`, `notes`, `service_latitude`, `service_longitude`,
`starts_at`, `ends_at` (cached span of its lines), timestamps.
Status and money are computed from the bookings, never stored on the visit.

`bookings.visit_id` (nullable: legacy bookings have none), `bookings.visit_position`
(0-based order of the line within the visit).

`GET /api/v1/availability/visit?service_ids[]=1&service_ids[]=2&date=YYYY-MM-DD`
`[&latitude=&longitude=&postal_code=&count=]`

```json
{
  "date": "2026-10-07",
  "by_time": {
    "09:15": {
      "single_tech": false,
      "lines": [
        { "service_id": 1, "service_name": "Lash Lift", "employee_id": 4,
          "name": "Dana", "title": "...", "photo_url": "...",
          "starts_at": "2026-10-07T13:15:00Z", "ends_at": "2026-10-07T14:15:00Z",
          "start_time": "09:15", "end_time": "10:15" }
      ]
    }
  },
  "next_available_date": null
}
```

## Testing

- Model spec: `Visit` lines ordered by position, computed status and total.
- Service spec: `VisitPlanner` (logic gate).
- Request spec: `/availability/visit` shape, validation (400), empty day.
- Gates: `bundle exec rspec`, `bin/rubocop`, `bin/brakeman --no-pager`.

## Notes for the AI

- Lines are back-to-back in the order given (D1). Same-tech consecutive lines
  have no turnaround between them (same address).
- Reuse `AvailabilityEngine` for candidate start grids and `TravelFeasibility`
  for travel; don't fork their logic.
- Times are wall-clock in `BusinessHours.zone`; no hand-rolled UTC math.
- Booking statuses that block a tech: pending, confirmed, in_progress (same as
  the `no_double_booking` constraint).
