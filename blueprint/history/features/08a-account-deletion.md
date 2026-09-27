# Feature: In-app account deletion

**From build-plan:** feature 8a
**Status:** complete

## Goal

Meet Apple 5.1.1(v) and Google Play's account-deletion rules: a customer or tech
can delete their account from inside the app (and a public web page explains
how), with a clear, guided flow. Deletion erases personal data and signs them
out everywhere, while bookings, payments and invoices stay, anonymized, as tax
and payout records (user decision 2026-09-27).

## In scope

- `users.deleted_at`. A deleted user is refused on every authenticated request,
  so their existing 30-day tokens stop working. Erasing email, phone, Google ID,
  password and passkeys means no sign-in path can find them again; signing up
  with the same email later creates a fresh account.
- `AccountDeletion` service, one transaction:
  - erases: first/last name, email (replaced with `deleted-<id>@deleted.invalid`),
    phone, password, street address/city/postal code, avatar, google_uid,
    webauthn_id, referral code, marketing opt-in, saved cards (Square card
    disabled best-effort; Helcim/Moneris tokens cleared);
  - destroys: addresses, device tokens, passkeys, magic-link tokens,
    notifications, sent messages, newsletter subscription, loyalty account;
  - on their bookings: clears `booked_for_name`, `booked_for_phone`, `notes`,
    service coordinates and the address link;
  - cancels upcoming (pending/confirmed) bookings with reason "Account deleted"
    and active subscriptions;
  - keeps payments, invoices, orders, shifts, earnings and reviews (reviews
    already detach from the user).
- `DELETE /api/v1/account` with `{ confirm: "DELETE" }`:
  - customers: allowed; if any cancelled upcoming booking had money paid,
    admins are notified to review refunds;
  - staff: refused while they have upcoming jobs ("Ask the office to reassign
    your N upcoming jobs first."); otherwise the employee profile is set
    inactive and not dispatchable;
  - admins: refused ("Ask another admin to remove your account.").
- Guided UI (shared component): what gets erased, what is kept and why, the
  upcoming bookings that will be cancelled, type DELETE to confirm, then sign
  out. On the customer app Account screen, the web customer settings page, and
  the staff app Profile.
- Public `/delete-account` page (Google Play's web link): what deletion does,
  how to do it in the app or on the website, and an email fallback
  (Bookings@baydspa.ca).

## Out of scope

- Privacy policy / terms pages (8b) and the staff location disclosure (8c).
- Admin tools to delete other users.
- Purging retained financial records after the retention period.

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - `deleted_at` + auth refusal + `AccountDeletion` service** -
  migration, service, `authenticate_user!` refuses deleted users. *Done when:*
  specs prove every erased field/record is gone, kept records remain, upcoming
  bookings are cancelled, and an old token for a deleted user gets 401.
- [x] **Step 2 - Account API** - `DELETE /api/v1/account` and
  `GET /api/v1/account/deletion_preview`, with the role rules and admin refund
  notice. *Done when:* request specs cover each role, a wrong confirm word,
  staff with upcoming jobs, the preview, and the admin notice.
- [x] **Step 3 - Guided delete flow in the customer app + web settings** -
  shared component on app Account and web customer settings. *Done when:* tsc +
  lint clean; in the running app a local test customer deletes their account
  and lands signed out.
- [x] **Step 4 - Staff app Profile + public `/delete-account` page** - *Done
  when:* tsc + lint clean; staff with an upcoming job sees the reassign message;
  the public page renders without signing in.

## Files / areas

- `db/migrate/*_add_deleted_at_to_users.rb`, `db/schema.rb`
- `app/services/account_deletion.rb`, `app/controllers/application_controller.rb`,
  `app/controllers/api/v1/accounts_controller.rb`, `config/routes.rb`
- `spec/services/account_deletion_spec.rb`, `spec/requests/api/v1/account_deletion_spec.rb`
- `client/components/account/delete-account.tsx` (shared), `client/lib/hooks/use-account.ts`,
  `client/app/app/account/page.tsx`, `client/app/dashboard/customer/settings/page.tsx`,
  `client/app/staff/profile/page.tsx`, `client/app/delete-account/page.tsx`

## Data / contracts

- Migration: `add_column :users, :deleted_at, :datetime` + index. Load-bearing:
  every authenticated request treats `deleted_at.present?` as no such user.
- `DELETE /api/v1/account` `{ confirm: "DELETE" }` -> 200 `{ deleted: true }`;
  422 `{ error }` for a wrong confirm word, staff with upcoming jobs, or admins.
- `GET /api/v1/account/deletion_preview` -> `{ upcoming_bookings: [{ id,
  service, starts_at, paid }], blocked_reason: string | null }`.

## Testing

- RSpec gate for steps 1-2 (service + request specs; Square stubbed).
- Steps 3-4: tsc + lint + running app with a local test user, removed after.
- `bin/ci` and full `bundle exec rspec` before `/complete`.

## Notes for the AI

- Never hard-delete the user row or any payment/invoice/order/shift record.
- Scope everything to `current_user`; no user id from the client.
- Best-effort external calls (Square card disable) must not block deletion.
- Mobile apps are purpose-built screens; match app-theme / staff-theme.
- No em dashes in copy, comments, or specs.
