# Feature: No-show charges full price

**From build-plan:** feature 7a
**Status:** complete

## Goal

When a tech marks a booking no-show, charge the customer the booking's full
unpaid price (service + folded-in add-ons, group size already reflected in
`total`) to their card on file. When that can't happen (no card, or Square
declines), the balance stays outstanding and every admin is alerted so they can
collect it by hand. Today the charge is a flat `Setting.no_show_fee` that
defaults to `$0`, so no-shows collect nothing and nobody notices.

## In scope

- `NoShowChargeJob` charges `booking.outstanding_balance` (total minus anything
  already paid, e.g. a group deposit or a pay-upfront payment). Fully paid
  bookings charge nothing.
- On a failed charge (no card or declined): no payment row, balance stays
  outstanding, and admins get an alert with the reason and amount.
- Admin alert: in-app + push to every admin (`NotificationService`, new kind
  `booking_no_show_uncollected`), plus one email to `ADMIN_NOTIFY_EMAIL` via
  `AdminMailer`. Idempotent: one alert per booking.
- Customer notification copy: says the amount charged, or says the balance is
  still owed when the charge didn't go through.
- Retire the flat fee: remove `no_show_fee` from `Setting` defaults, the admin
  settings `KEYS`, and the `Booking` status comment. No admin UI uses it.
- Tech no-show confirm dialog copy (`staff-booking-card.tsx`) and hook comment
  (`use-employee.ts`) say the full booking price, not "the no-show fee".

## Out of scope

- Requiring a card to book, and policy consent (7b web, 7c app).
- Automatic retry of a declined charge, or a customer "pay now" link for the
  outstanding no-show balance. Admin collects it through existing tools.
- Tips on no-shows (never charged).
- Late-cancel fees.
- Refunding a no-show marked by mistake. Full price raises the cost of a wrong
  tap; the existing guards stay (only after `starts_at`, never on a completed or
  cancelled booking, confirm dialog), and a refund stays a manual Square action.

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Charge the full outstanding balance** - `NoShowChargeJob#charge_fee`
  uses `booking.outstanding_balance` instead of `Setting.no_show_fee`; skips when
  it is 0; charge note reads "No-show - <service> #<id>". Customer notification
  mentions the amount charged. Update `no_show_charge_job_spec.rb` (drop the
  `Setting.set` setup and the "fee is zero" case; add "charges total minus a
  prior deposit" and "fully paid booking charges nothing"). *Done when:* the job
  spec is green, and a $100 booking with a $50 paid deposit charges 5000 cents.
- [x] **Step 2 - Alert admins when it can't be collected** - `charge_fee` returns
  a reason on failure (`:no_card` or the Square error). New `Notification` kind
  `booking_no_show_uncollected`; `notify_admins` delivers it to each admin (once
  per admin per booking, `action_url` to `/dashboard/admin/bookings`), and
  `AdminMailer.no_show_uncollected` emails `ADMIN_NOTIFY_EMAIL` once (html + text
  templates). Customer copy for the uncharged case says the balance is still
  owed. *Done when:* specs prove: no card -> admin notified + email enqueued +
  no payment; declined -> same, reason included; successful charge -> no admin
  alert; re-running does not duplicate the alert or email.
- [x] **Step 3 - Retire the flat fee** - remove `no_show_fee` from
  `Setting::DEFAULTS` and `Setting.no_show_fee`, from `Admin::SettingsController::KEYS`,
  and fix `admin_invoice_settings_spec.rb`; update the `Booking` status comment.
  *Done when:* `grep -rn no_show_fee app spec` is empty and those specs pass.
- [x] **Step 4 - Staff copy** - the tech's Mark no-show confirm dialog states the
  customer is charged the booking's full price (showing the outstanding amount)
  to their card on file (`booking.outstanding_balance`, already serialized); if
  it is 0, it says nothing will be charged. Update the hook comment. *Done when:* `npx tsc --noEmit`
  and `npm run lint` pass in `client/`, and the dialog text shows the amount in
  the running staff app.

## Files / areas

- `app/jobs/no_show_charge_job.rb` (server)
- `app/models/notification.rb` (new kind), `app/models/setting.rb`, `app/models/booking.rb` (comment)
- `app/mailers/admin_mailer.rb` + `app/views/admin_mailer/no_show_uncollected.{html,text}.erb`
- `app/controllers/api/v1/admin/settings_controller.rb`
- `spec/jobs/no_show_charge_job_spec.rb`, `spec/requests/api/v1/admin_invoice_settings_spec.rb`,
  `spec/mailers/admin_mailer_spec.rb`
- `client/app/staff/staff-booking-card.tsx`, `client/lib/hooks/use-employee.ts` (client)
- `client/app/dashboard/customer/notifications/page.tsx` (label for the new kind)

## Data / contracts

- No migration. `notifications.kind` is a string enum; add
  `booking_no_show_uncollected: "booking_no_show_uncollected"`.
- No-show payment row unchanged (load-bearing for idempotency and reporting):
  `processor: "square_no_show"`, `method: "card"`, `status: "paid"`,
  `amount` = the amount actually charged.
- Admin `GET/PATCH /api/v1/admin/settings` no longer returns or accepts
  `no_show_fee` (no client uses it).

## Testing

- RSpec is the gate (`bundle exec rspec`). In-scope logic: the job's amount
  calculation, failure branching, and alert idempotency (steps 1-3). Square is
  always stubbed.
- `bin/rubocop` and `bin/brakeman --no-pager` clean.
- Step 4 is copy only: typecheck + lint + a look at the dialog in the running
  staff app.

## Notes for the AI

- The job is best-effort: marking a booking no-show must always succeed. Keep the
  outer `rescue` and never raise out of `perform`.
- Idempotency guard stays `payments.where(processor: "square_no_show").exists?`;
  admin alerts guard on an existing `Notification` of the new kind per admin,
  and the email is sent only on the run that creates the first alert.
- `outstanding_balance` already floors at 0 and subtracts all paid payments
  (gift card, deposit, pay-upfront). Don't re-derive the price from the service.
- Money is `decimal`; convert to cents with `(amount * 100).round.to_i`.
- Match the admin-notify pattern in `overdue_booking_sweep_job.rb`
  (`User.where(role: :admin)`, absolute `APP_URL` links) and the recipient
  fallback in `admin_mailer.rb`.
- No em dashes in code comments, copy, or specs.
