# Feature: Visit booking

**From build-plan:** feature 9b
**Status:** complete

## Goal

Book a multi-service visit in one request: every service becomes its own booking
with its own tech (from `VisitPlanner`), created all-or-nothing, paid with one
charge split per booking, each tech told about their job, the customer told
once, and one invoice for the whole visit.

## In scope

- `VisitBooker` - validation, coverage, all-or-nothing creation, race fallback.
- `VisitPaymentService` - deposit / pay-now / pay-after, gift card, tip split,
  card-on-file charge or one `VST-<id>` payment link; webhook settles `VST-`.
- Notifications: new `assigned` staff notice for every new booking; customer
  reminders sent once per visit (first active line) naming every service.
- `POST /visits` (guest-friendly, same intake rules as `POST /booking_requests`),
  `GET /visits`, `GET /visits/:id`, `POST /visits/:id/pay` (own visits only).
- `VisitSerializer`; `BookingSerializer` gains `visit_id` + `visit_lines`.
- Visit invoice: issued when every line is finished; refreshed on payment.

## Out of scope

- Booking UI (9c/9d); visit reschedule/cancel (9e); subscriptions on visits (9f).
- `POST /booking_requests` stays as is for older app builds.

## Build steps

- [x] **Step 1 - VisitBooker** - validate services/start/address, coverage
  gate, `plan_at` with strict coverage, create `Visit` + bookings in one
  transaction, retry with the losing tech excluded on `no_double_booking`,
  pending when money is due up front, group deposit on the visit total.
  *Done when:* service spec green (single tech, split, race fallback, slot
  taken, outside coverage, pending vs confirmed).
- [x] **Step 2 - VisitPaymentService + webhook** - largest-remainder split by
  line total, gift card, tip split, card charge or `VST-` link, `Visit#mark_paid!`,
  `PaymentWebhookProcessor` routes `VST-`. *Done when:* spec green.
- [x] **Step 3 - Notifications** - `assigned` staff reminder; customer reminders
  once per visit with all services named. *Done when:* job spec green.
- [x] **Step 4 - Endpoints + serializers** - `BookingIntake` concern shared with
  booking requests, `VisitsController`, routes, `VisitSerializer`,
  `BookingSerializer#visit_lines`. *Done when:* request spec green.
- [x] **Step 5 - Visit invoice** - `InvoiceBuilder` for a `Visit`, issued when
  the last line finishes, refreshed when money lands. *Done when:* spec green;
  full rspec, rubocop, brakeman clean.

## Data / contracts (load-bearing)

`POST /api/v1/visits` (no auth required)

```json
{
  "customer": { "email": "...", "first_name": "...", "phone": "..." },
  "address": { "line1": "...", "city": "...", "province": "...", "postal_code": "...",
               "latitude": 43.6, "longitude": -79.3, "is_apartment": false, "buzz_code": null },
  "visit": {
    "service_ids": [3, 8], "starts_at": "2026-10-07T09:15:00", "address_id": null,
    "client_type": "adult", "party_size": 1, "payment_timing": "pay_after",
    "booked_for_name": null, "booked_for_phone": null, "notes": null,
    "tip": 0, "gift_card_code": null, "group_charge": "deposit"
  }
}
```

`starts_at` is wall-clock in the company zone (same as booking requests).
201 → `{ visit: VisitSerializer, payment: { mode, url? } }`.
422 → `{ code, error }` with codes `no_coverage`, `outside_hours`,
`no_availability`, `slot_taken`, `invalid`. Phone-only guest → 201
`{ status: "follow_up" }` (same as booking requests).

`VisitSerializer`: `id, starts_at, ends_at, status, client_type, party_size,
payment_timing, booked_for_name, booked_for_phone, notes, subtotal, total,
amount_paid, outstanding_balance, address, lines: [BookingSerializer]`.

`BookingSerializer` adds `visit_id` and `visit_lines`:
`[{ id, service_name, starts_at, ends_at, status, employee: { id, name, photo_url } }]`
(the OTHER lines of the visit; `[]` for a standalone booking).

Payment reference `VST-<visit id>`; per-booking `Payment` rows share the
processor reference.

## Testing

- `spec/services/visit_booker_spec.rb`, `spec/services/visit_payment_service_spec.rb`,
  `spec/jobs/booking_reminder_job_visit_spec.rb`, `spec/requests/api/v1/visits_spec.rb`,
  `spec/services/invoice_builder_visit_spec.rb`.
- Square is stubbed in every spec.

## Notes for the AI

- Each line is a normal `Booking` so every existing per-booking flow (clock-in,
  no-show, payouts, reviews, chat) keeps working untouched.
- Never trust a client user id: visits are scoped to `current_user`.
- Best-effort side effects (notifications, admin emails) never break booking.
