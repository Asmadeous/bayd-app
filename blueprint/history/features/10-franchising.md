# Feature: Franchising

**From build-plan:** features 10a-10g
**Status:** complete

## Goal

Run branches in other countries on the one API and database. A super admin
creates a franchise and fills in its setup in the console (no code, no deploy);
a franchise admin runs that branch exactly like today's admin; customers keep one
login. Today's data becomes the Canada franchise and behaves exactly as before.

## In scope

- `Franchise` model, `super_admin` role, `users.franchise_id`, `Current.franchise`
  resolved per request (staff: their account; super admin: `X-Franchise`;
  everyone else: `X-Franchise`, then the `Origin` host, then the default).
- Row-level tenancy: `franchise_id` on every root franchise-owned table, filled
  with Canada, NOT NULL; `FranchiseScoped` default scope; jobs carry the
  franchise they were enqueued under; per-franchise unique slugs.
- Per-franchise config used everywhere: time zone, open hours, currency, tax,
  staff email domain, contact/sender/SMS names, settings, coverage by postal
  prefix (any country) or radius around a tech's base.
- Payments per franchise: each franchise's own Square keys (encrypted), card
  on file per franchise (`payment_profiles`), webhooks per franchise, "Test
  connection". Square only (Stripe was removed at your request).
- Super admin API + console: franchises CRUD and setup, draft → live, invite and
  remove franchise admins, copy the service catalog, switcher, cross-franchise
  analytics, royalty statements.
- Web + apps: franchise config endpoint, money/time formatting from it, the
  customer app picks the franchise from the address, legal pages + contact from
  the console, CORS from franchise domains.

## Out of scope

- Drawn map polygons for coverage (radius + postal prefixes cover any country).
- Translating the UI into other languages.
- Splitting into separate databases (only if a country requires data residency).

## Build steps

- [x] **Step 1 - Franchise foundation** - model + migration (Canada row),
  `Current`, `super_admin`, `users.franchise_id`, request resolution,
  `GET /franchise`. *Done when:* specs green, existing suite green.
- [x] **Step 2 - Tenant columns + scoping** - migrations (add, backfill, NOT
  NULL, indexes), `FranchiseScoped`, job propagation, cron jobs per record,
  admin alerts and fleet channel per franchise. *Done when:* cross-franchise
  leak specs green, existing suite green.
- [x] **Step 3 - Locale config** - zone/hours, currency, tax, staff domain,
  settings, generic postal prefixes + radius coverage, address check by country.
  *Done when:* specs for a non-Canada franchise green.
- [x] **Step 4 - Payments per franchise** - encryption, per-franchise Square
  keys, `payment_profiles`, per-franchise webhooks, test connection. *Done
  when:* specs green (Square stubbed).
- [x] **Step 5 - Super admin API + royalties** - franchises CRUD/setup/go-live,
  admins invite/remove, catalog copy, analytics, statements. *Done when:*
  request specs green; rubocop + brakeman clean.
- [x] **Step 6 - Client: franchise context** - config provider, `X-Franchise`,
  money + time formatting from config, customer app franchise from address,
  legal pages from config. *Done when:* tsc + lint + build green.
- [x] **Step 7 - Client: super admin console** - franchises list, setup flow,
  detail (settings, payments, legal, admins, statements), switcher,
  cross-franchise analytics. *Done when:* driven in the browser: create a
  franchise, invite an admin, go live.

## Data / contracts (load-bearing)

- `franchises`: name, slug (unique), status (draft/live/suspended), default
  (bool, exactly one), country_code, currency, locale, time_zone, open_hour,
  close_hour, tax_name, tax_rate, tax_registration_number, contact_email,
  contact_phone, reply_to_email, sender_name, sms_sender, staff_email_domain,
  subdomain, custom_domain, payment_gateway, gateway credentials (encrypted
  JSON), royalty_pct, privacy_body, terms_body, business_address, timestamps.
- `GET /api/v1/franchise` (public): the current franchise's public config
  (no credentials).
- Header `X-Franchise: <slug>` selects a franchise (customers, public, super admin).
- `payment_profiles`: user_id, franchise_id, gateway, customer_ref, card_ref,
  card_brand, card_last4.
- `royalty_statements`: franchise_id, period_start, period_end, gross, refunds,
  royalty_pct, royalty_due, currency, status (open/paid), paid_at.

## Testing

- Leak specs: two franchises; each role only ever sees its own franchise.
- Locale specs: a UK-style franchise books in its zone, prices in its currency,
  covers by postal prefix.
- Client: tsc, lint, build; console driven in the browser (bin/dev only).

## As built

- Payments are Square only. The `franchises.payment_gateway` and
  `payment_profiles.gateway` columns stay (rolling the migration back was
  blocked) and always hold `square`.
- Coverage is postal prefixes or a radius around the tech's base; drawn map
  polygons stayed out of scope.
- Verified in the browser as a super admin: created a UK draft franchise, copied
  the catalog, invited an admin, saved Square keys (placeholders), wrote legal
  text, added a technician, went live, then suspended it again.
- `GET /franchise` also returns `staff_email_domain`, so staff forms check the
  branch's own domain instead of `@baydspa.ca`.
- The mobile export builds (`npm run build:mobile*`) were not run: they move
  `app/` aside mid-build and would break a running `bin/dev`.

## Notes for the AI

- Canada must behave exactly as today when nothing is configured.
- Never print or read secrets; payment keys are entered in the console and
  stored encrypted; only presence is ever shown back.
- Seeds stay idempotent and never overwrite live franchise config.
