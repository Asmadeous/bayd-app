# Franchising + Multi-Service Bookings Plan

Two roadmap phases on the ONE Rails API, one Postgres database, one customer app
and one staff app:

- **Phase 9 - Multi-service bookings.** A customer books any services together;
  each service gets its own technician, picked by the system.
- **Phase 10 - Franchising.** Branches in other countries, each with its own
  setup, all on our API. A super admin manages franchises and their admins; a
  franchise admin is today's admin, scoped to one branch.

Build order: **9 first, then 10.** Phase 9 is self-contained and customer-facing;
Phase 10 touches nearly every table. Phase 7b (card required at `/book`) is built
on top of the new Phase 9 checkout step, so checkout is rebuilt only once. New
Phase 9 code must not add any new Canada-only assumptions (zone, currency,
postal), so Phase 10 stays cheaper.

## Locked defaults

These are the working decisions the specs are written against. Change any of them
before its sub-feature is specced.

| # | Decision | Default |
|---|---|---|
| D1 | Two techs on one visit | **Back-to-back**, in the order the customer added the services (same as the Square Appointments "Add more to your appointment?" flow in `docs/addmoreappointments.pdf`) |
| D2 | One tech can do every service | **That tech takes the whole visit** back-to-back (fewer trips, today's add-on behaviour) |
| D3 | Tech choice | **No Staff step.** The system picks the techs |
| D4 | Staff on a shared visit | A tech can cancel **only their own line** (admin alerted to reassign). Rescheduling a shared visit is customer or admin |
| D5 | Customer accounts | **One login worldwide.** The address decides which franchise serves the booking |
| D6 | Catalog | **Each franchise owns its services and prices**, copied from a template (Canada) when the franchise is created |
| D7 | Adding a country | **Self-serve.** The super admin creates a franchise in the console and fills in its setup. No code change, no deploy, no developer (see "Adding a country") |
| D8 | Franchise fees | **In scope now.** Royalty / platform-fee % per franchise, reported to the super admin |

---

## Phase 9 - Multi-service bookings

### Today vs new

| | Today | New |
|---|---|---|
| Unit | One `Booking` = one service + one tech | One `Visit` = N bookings, one per service, each with its own tech |
| Add-ons | Note on the booking (`raw["addons"]`), same tech only, lashes can't mix (`AddonBooker`) | Real services from **any** category, each scheduled and assigned |
| Flow | Details → Service → Staff → Add-ons → Date → Payment | **Details → Service → Add-on services → Time → Checkout** |
| Upcoming card | One tech | Every tech on the visit (photo, name, service, time) |
| Staff | One job | Each tech gets their own job, notifications and reminders |

### Data model

- **`visits`** (new): `user_id`, `address_id`, `client_type`, `party_size`,
  `payment_timing`, `booked_for_name`, `booked_for_phone`, `notes`, service
  lat/lng, `starts_at`/`ends_at` (cached span), timestamps. Status and money
  are computed from the bookings, never stored. Later gets `franchise_id`.
- **`bookings.visit_id`** (new, nullable for legacy bookings). Each booking stays
  the unit for one tech: own job, clock-in, `no_double_booking`, no-show charge,
  payouts, review, chat.
- **`bookings.visit_position`** (int): order of the line inside the visit.
- `parent_booking_id` is NOT reused (it is the recurring rebook chain used by
  `awaiting_rebook`).
- The note-only add-on path (`AddonBooker`, `raw["addons"]`) is retired for new
  bookings. Legacy bookings keep displaying their notes.

### Scheduling - `VisitPlanner`

Input: ordered services, address (lat/lng + postal), date, client type, party size.
Output: open start times, and for each time the tech + start/end of every line.

1. For each start time, try **one tech who performs every service** (D2): the
   whole visit back-to-back must fit their bookable hours, be free, and pass
   `TravelFeasibility`.
2. Otherwise **split**: line 1 at `start`, line 2 at `start + line 1 duration`
   (D1), each line assigned to the nearest eligible tech free for that window
   (same eligibility as `AssignmentService`: active, dispatchable, performs the
   service, covers the postal area, `available_at?`, travel-feasible).
3. A tech already used for an earlier line in the same visit is allowed for a
   later line only if their windows don't collide.
4. Reuses `AvailabilityEngine` (bookable windows, existing bookings) and
   `TravelFeasibility` unchanged. Next-available-date search stays bounded.

### Booking creation - `VisitBooker`

- All lines are created in **one transaction: all or nothing**.
- On a `no_double_booking` violation for a line, try the next candidate tech for
  that line. If no candidate is left, roll back the whole visit and return
  `slot_taken` ("That time was just booked, pick another").
- Each booking gets status, reminders (`BookingReminders`) and notifications
  for its own tech. The customer gets one confirmation for the visit.
- Pay-upfront / group-deposit holding (`pending` → `confirmed`) applies to the
  whole visit: all lines confirm together when the money lands.

### API

- `GET /availability/visit?service_ids[]=..&date=..&latitude=..&longitude=..&postal_code=..&count=..`
  → `{ date, by_time: { "HH:MM": [ { service_id, employee_id, name, photo_url, starts_at, ends_at } ] }, next_available_date }`
- `POST /visits` (replaces `POST /booking_requests` for the customer flow;
  the old endpoint stays working for older app builds until they age out).
- `GET /visits`, `GET /visits/:id`, `PATCH /visits/:id/reschedule`,
  `POST /visits/:id/cancel` (customer, own visits only).
- Booking serializers gain `visit_id` and `visit_lines` (the other techs on the
  visit) so staff can see who they share the visit with.

### Checkout and payment

- One checkout, **one charge for the visit total**.
- The charge is recorded as one `Payment` per booking (shared processor
  reference), split by line price. Each tech's earnings, partner payouts,
  invoice lines, refunds and no-show charges stay correct per booking.
- A tip at checkout is split across the techs by line price. Techs can still be
  tipped individually after the service.
- Gift card and loyalty apply to the visit total, then split by line.
- One invoice per visit, one line per service, showing the tech.
- Phase 7b's card-on-file + policy-consent step lives in this Checkout step.

### Reschedule and cancel

- **Customer:** reschedule or cancel the whole visit. Reschedule re-runs
  `VisitPlanner`; techs may change and the customer is told who is coming.
- **Admin:** reschedule/cancel the whole visit, or reassign / cancel one line.
- **Staff (D4):** cancel only their own line; admin is alerted to reassign it.
  Staff reschedule (6d) is disabled on shared visits, with a plain message.
- No-show and missed are per line (a tech who didn't come doesn't make the
  customer a no-show for the other tech).

### Groups and recurring (in scope)

- **Group + multi-service:** each line is party-extended (duration × party size)
  exactly like a group booking today; deposit rules apply to the visit total.
- **Recurring visits:** a `Subscription` points at the visit; the rebook job
  re-plans the whole visit for the next occurrence (techs may differ), and the
  customer is notified if any line can't be filled.

### Screens

| Surface | Change |
|---|---|
| Web `/book` + customer dashboard book | Five steps. "Add more to your appointment?" lists every active service across categories with price and duration |
| Customer app Book | Same `BookingFlow` component, so it follows automatically |
| Customer upcoming card, next appointment, booking detail (web + app) | One card per visit listing every tech, service and time; reschedule/cancel act on the visit |
| Customer day-of | Track and chat with each tech |
| Staff app job card + job page | "Shared visit: Claire, Pedicure 11:30"; own line actions only |
| Staff new booking (6d) + admin new booking | Same multi-service flow |
| Admin bookings list + calendar | Grouped by visit; reassign or cancel a single line |

### Sub-features

| # | Delivers |
|---|---|
| 9a | `Visit` model + migration, `bookings.visit_id`/`visit_position`, `VisitPlanner` + `GET /availability/visit`, specs |
| 9b | `VisitBooker` + `POST /visits`: all-or-nothing assignment, payment split, per-tech notifications/reminders, one invoice per visit |
| 9c | Web `/book` five-step flow (any-service add-ons, no Staff step, combined times, checkout); customer dashboard visit cards |
| 9d | Customer app visit cards + day-of for every tech; staff app shared-visit info and own-line-only actions |
| 9e | Visit reschedule/cancel (customer + admin), admin reassign/cancel one line, admin + staff new-booking on the multi-service flow |
| 9f | Groups and recurring on visits |

---

## Phase 10 - Franchising

### Architecture

**Row-level tenancy: a `franchise_id` on every franchise-owned table, one
database, one deploy.**

| Option | Verdict |
|---|---|
| `franchise_id` column + `Current.franchise` | **Chosen.** One deploy, one migration run, super-admin reporting is plain SQL |
| Postgres schema per franchise (apartment gem) | Rejected: migrations per schema, hard cross-franchise reporting, gem unmaintained |
| Database per franchise | Fallback only if a country legally requires in-country data storage |

Leak protection (the main risk of row-level tenancy):

- A `FranchiseScoped` model concern: every query on a franchise-owned model goes
  through `Current.franchise`; a query with no franchise set raises in
  development/test and logs + fails closed in production.
- Request specs per role that try to read and write another franchise's data.
- Optional later: Postgres row-level security as a second guard.

### `Franchise` model

`name`, `slug`, `status` (draft / live / suspended), `country_code`, `currency`,
`time_zone`, `locale`, `postal_code_pattern` (optional regex, validation only),
`tax_name`, `tax_rate`, `tax_registration_number`, `business_open_hour`,
`business_close_hour`, `contact_email`, `contact_phone`, `reply_to_email`,
`sms_sender`, `staff_email_domain`, `subdomain`, `custom_domain` (optional),
`payment_gateway`, encrypted gateway credentials (Active Record encryption),
`royalty_pct`, `privacy_body` / `terms_body` (edited in the console), timestamps.

### Adding a country (no developer)

Everything a country differs on is data the super admin enters, never code:

1. **Super admin → Franchises → New.** Name, country (dropdown of all ISO
   countries), currency (all ISO 4217), time zone (all IANA zones), tax name +
   rate + registration number, business hours, contact details, SMS sender
   name, staff email domain, royalty %.
2. **Website address.** Picks a subdomain (e.g. `uk.baydspa.ca`), live at once:
   wildcard DNS + wildcard TLS certificate and CORS read from the franchises
   table, so no server change per country. A custom domain is optional and is
   the only step that needs DNS done by whoever owns that domain.
3. **Coverage.** Country-agnostic: the franchise admin sets each tech's area as a
   radius around their base or a drawn map area (PostGIS), with optional postal
   prefixes matched generically (no per-country postal code code). Address
   search and validation use the franchise's country with Google Places, which
   is worldwide.
4. **Payments.** Pastes that franchise's own Square account keys; a "Test
   connection" button checks them.
5. **Catalog.** "Copy from template" brings in the standard services; the
   franchise admin then sets local prices and turns services on or off.
6. **Legal.** Privacy policy and terms edited in the console per franchise
   (prefilled from the template, then legal review).
7. **Invite the franchise admin** by email. They add staff, schedules and
   coverage themselves.
8. **Go live** switches status from draft to live. Until then the franchise is
   invisible to customers.

The customer app and staff app need no new build: they work worldwide and pick
the franchise from the address (customers) or the account (staff).

The only case that still needs a developer: a country Square doesn't operate
in. Adding another payment provider is your decision.

### Roles

| Role | Scope | Can |
|---|---|---|
| `super_admin` (new) | All franchises | Create/suspend franchises, invite and remove franchise admins, edit the catalog template, switch into any franchise, cross-franchise analytics, royalty reports |
| `admin` = franchise admin | Own franchise | Everything today's admin does, inside their franchise |
| `employee` / `partner` | Own franchise | Unchanged |
| `customer` | Global account (D5) | Books with whichever franchise covers the address |

`users.franchise_id`: required for admin/employee/partner, null for
super_admin and customers.

### How a request knows its franchise

- **Web:** hostname → `franchises.domains` (e.g. `baydspa.ca` → Canada).
- **Apps:** one customer app + one staff app worldwide. Staff/admin: from their
  account (forced, can't switch). Customer: from the address being booked, sent
  as `X-Franchise` by the client once resolved.
- **Super admin:** `X-Franchise` switcher; without it they get the global console.
- **Jobs, mailers, channels:** franchise comes from the record (e.g.
  `booking.franchise`), never from the request.

### Per franchise vs shared

| Per franchise | Shared |
|---|---|
| Services, categories, prices | Customer accounts |
| Employees, schedules, overrides, coverage, service areas | Brand content: blog, gallery, forum (optional franchise tag) |
| Visits, bookings, booking requests, assignment attempts | Franchise inquiries (to super admin) |
| Payments, invoices, tips, gift cards, loyalty, subscriptions | |
| Settings | |
| Products, variants, orders (currency, shipping) | |
| Partners, payouts, shifts, location pings | |
| Callbacks, contact messages, job postings/applications, support threads, meetings, notifications for admins | |

### Canada-only assumptions to remove (found in code)

| Where | Today | Becomes |
|---|---|---|
| `BusinessHours.zone` (29 files) | One `BOOKING_TIMEZONE` env | `franchise.time_zone` via the record's franchise |
| `BusinessHours::OPEN_HOUR/CLOSE_HOUR` | Constants | Franchise hours |
| `PostalCode` + FSA coverage | Canadian FSA only | Radius / drawn map areas (PostGIS) + generic postal prefixes; Canada keeps its FSA lists as prefixes |
| `GeoController` address check + Places autocomplete | Canada only (`in_canada`) | The franchise's country |
| `SquareService`, `InvoiceBuilder` | `"CAD"` hardcoded | `franchise.currency` |
| Mailers/views `number_to_currency` | `$` default | Franchise currency + locale |
| Invoices | HST + `invoice_hst_number` setting | `tax_name`, `tax_rate`, `tax_registration_number` |
| `User::EMPLOYEE_EMAIL_DOMAIN` | `@baydspa.ca` | `franchise.staff_email_domain` |
| Square / Helcim | One set of ENV credentials | Per-franchise gateway + encrypted credentials; gateway adapter so a country Square/Helcim doesn't serve gets a new gateway |
| `users.square_customer_id` / `square_card_id` | One card on the user | New `payment_profiles` (user × franchise × gateway customer/card) |
| `Setting` | Key unique globally | Unique per `(franchise_id, key)` |
| Unique codes | Global: invoice number, gift card code, category slug, SKU | Unique per franchise; invoice numbers sequential per franchise |
| Admin alerts (`User.where(role: :admin)`, 14 files) | All admins | That franchise's admins |
| `AdminFleetChannel` | One stream | Per-franchise stream |
| `ALLOWED_ORIGINS` / CORS / ActionCable / WebAuthn | Fixed env list | Env list plus every live franchise's domains, read from the database |
| Privacy / terms / `Bookings@baydspa.ca` | Hardcoded pages, one contact | Edited per franchise in the console |
| Emails | One sender | One verified sending domain; per-franchise sender name and reply-to |
| Infobip SMS sender | One | Per-franchise sender name |

### Data migration

1. Create the **Canada** franchise with today's values (Toronto zone, CAD, HST,
   FSA postal, `@baydspa.ca`, current Square/Helcim credentials, domains).
2. Backfill `franchise_id` = Canada on every franchise-owned row; move existing
   saved cards into `payment_profiles`; move settings to Canada.
3. Make `franchise_id` NOT NULL; swap global unique indexes for per-franchise.
4. Current admins become Canada franchise admins; promote the chosen super admins.

All seeds stay idempotent (`db:seed` runs every deploy) and never overwrite live
franchise config.

### Royalties (D8)

- `franchise.royalty_pct`; a monthly `FranchiseStatement` per franchise:
  gross completed revenue, refunds, royalty owed, in the franchise's currency.
- Super admin dashboard: statements per franchise, mark paid. No FX conversion;
  reports group by currency.

### Sub-features

| # | Delivers |
|---|---|
| 10a | `Franchise` model, `super_admin` role, `Current.franchise` resolution (host, header, account), Canada franchise created; no behaviour change |
| 10b | `franchise_id` on every franchise-owned table + backfill + NOT NULL, `FranchiseScoped` enforcement, admin alerts and channels per franchise, cross-franchise leak specs |
| 10c | Locale config from data: zone, hours, currency, tax, country-agnostic coverage (radius / map areas / generic postal prefixes), staff email domain, per-franchise settings and unique codes |
| 10d | Payments per franchise: each franchise's own Square keys, encrypted, entered in the console with "Test connection", `payment_profiles`, webhooks routed to the right franchise |
| 10e | Super admin console (web): "New franchise" setup flow (all of "Adding a country"), draft → live, invite/remove franchise admins, catalog template copy, franchise switcher, cross-franchise analytics |
| 10f | Web + apps: franchise from subdomain/address, wildcard subdomains + CORS from the database, currency/date formatting, legal pages and contact from the console |
| 10g | Royalty statements + super admin reporting |

## Open items

- **Payment provider coverage.** Payments are Square only. A country Square
  doesn't operate in can't take card payments until a provider is chosen for
  it (that is a code change, decided by you).
- **One-time server setup for subdomains:** wildcard DNS record and wildcard
  TLS certificate for `*.baydspa.ca` on the nginx host (not managed by Kamal).
- **Data residency.** Confirm no launch country requires in-country storage
  before 10b (that would change the architecture to database-per-franchise).
- **Legal review** of per-country privacy/terms before each franchise goes live.
