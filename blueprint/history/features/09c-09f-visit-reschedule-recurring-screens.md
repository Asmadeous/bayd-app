# Feature: Multi-service bookings - reschedule, recurring, and screens

**From build-plan:** features 9c, 9d, 9e, 9f
**Status:** complete

## Goal

Finish Phase 9: visits can be rescheduled and cancelled under each role's rules
(9e), repeat on a schedule and work for groups (9f), and every screen books and
shows visits: the five-step web flow (9c), and the customer app + staff app
(9d). Backend first so each screen is wired once.

## In scope

- `Visit#reschedule!` (re-plan techs, or keep them for a staff move), visit
  cancel; customer `POST /visits/:id/reschedule|cancel`; admin
  `POST /admin/visits/:id/reschedule|cancel`; customer single-line booking
  reschedule delegates to the visit; staff reschedule refuses a shared visit
  (moves an all-theirs visit), staff cancel stays per line.
- Cancel notices: the customer hears once per visit cancel.
- Recurring visits: `subscriptions.service_ids` + `party_size`; subscription
  started from a visit; scheduler re-plans the whole visit each cycle.
- Staff `create_booking` takes `service_ids[]` and books real lines on the
  tech's own schedule (replaces note-only add-ons for staff).
- Web `/book` (and the customer app Book, same component): Details → Service →
  Add-ons (any service) → Time (combined) → Checkout; `POST /visits`.
- Visit-aware cards: dashboard next appointment + lists + calendar detail,
  customer app home/bookings/detail, staff job card/page ("shared visit").

## Out of scope

- Franchise anything (Phase 10). Card-on-file requirement (7b).

## Build steps

- [x] **Step 1 - Visit reschedule + cancel (model)** - `Visit#reschedule!`
  (planner re-plan or keep techs, deferred constraint, notifications,
  reminders), `Visit#cancel!`; cancel notice once per visit. *Done when:* model
  spec green.
- [x] **Step 2 - Visit reschedule/cancel endpoints** - customer + admin visit
  endpoints, customer booking reschedule delegates, staff rules on visit lines.
  *Done when:* request specs green.
- [x] **Step 3 - Recurring visits** - migration, `Subscription.start_from_visit`,
  scheduler books a visit, `POST /visits` accepts recurrence. *Done when:* spec green.
- [x] **Step 4 - Staff multi-service booking** - `create_booking` with
  `service_ids[]` makes a visit on the tech's schedule. *Done when:* spec green;
  full rspec, rubocop, brakeman clean.
- [x] **Step 5 - Web booking flow** - five steps, `/availability/visit`,
  `POST /visits`, plan shown under the picked time, staff mode on the new
  steps with `service_ids`. *Done when:* `tsc` + lint clean; flow driven in the
  browser books a two-tech visit.
- [x] **Step 6 - Visit-aware customer screens (web)** - grouped cards, next
  appointment with every tech, visit reschedule/cancel. *Done when:* dashboard
  shows one card with both techs.
- [x] **Step 7 - Apps** - customer app home/bookings/detail grouped by visit
  with every tech; staff job card/page shared-visit info and shared-visit
  reschedule message. *Done when:* `tsc` + lint clean; screens verified.

## Data / contracts (load-bearing)

- `POST /api/v1/visits/:id/reschedule` `{ starts_at }` (company-zone wall clock)
  → `VisitSerializer`; 422/409 `{ code, error }` (`not_reschedulable`,
  `outside_hours`, `no_availability`, `slot_taken`, cutoff/cap messages).
- `POST /api/v1/visits/:id/cancel` `{ reason? }` → `VisitSerializer`.
- `POST /api/v1/admin/visits/:id/reschedule` `{ starts_at, keep_techs? }`,
  `POST /api/v1/admin/visits/:id/cancel` `{ reason? }`.
- `subscriptions.service_ids` int[] (empty = legacy single service),
  `subscriptions.party_size` int default 1.
- `POST /api/v1/employee/bookings` (staff create) accepts `service_ids[]`;
  `service_id` still works.

## Testing

- `spec/models/visit_reschedule_spec.rb`, `spec/requests/api/v1/visit_changes_spec.rb`,
  `spec/models/subscription_visit_spec.rb`, staff create spec.
- Client: `npx tsc --noEmit`, `npm run lint`; drive `/book` in the browser
  (bin/dev only).

## Notes for the AI

- Cutoff 24h and max 2 customer reschedules apply per visit (lead line count).
- Never hard-delete; cancel means status cancelled.
- No new Canada-only strings in new UI (no "ET"); times come from the API.
