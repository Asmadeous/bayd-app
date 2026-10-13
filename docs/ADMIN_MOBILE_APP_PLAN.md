# BAYD Admin - mobile app plan

Draft for review, 2026-10-05. Not in `blueprint/build-plan.md` yet; it goes in
as Phase 11 once you approve it.

## Goal

The admin dashboard on a phone: **everything the web admin dashboard does, the
app does**, with the same data, the same actions and the same permissions. Only
the layout changes. It is purpose-built like the customer and staff apps (its
own screens, reusing `client/`'s API layer, types, hooks and small
components), not the website wrapped. Navigation is a hamburger menu (a
slide-in drawer), not a bottom tab bar.

Admins and super admins share the one app, and it shows each role what the web
dashboard shows them: a franchise admin works in their own franchise; a super
admin also gets the "Working in" switcher and the franchise console.

## Navigation: the web sidebar, in a hamburger menu

Each screen's header has a menu button that opens a drawer with exactly the web
sidebar's groups and sections, in the same order: Dashboard (Overview,
Notifications, Analytics, Calendar), People, Bookings, Workforce, Catalog,
Commerce, Content and Settings. Super admins also get the Franchises group
first and the "Working in" choice at the top, as on the web. Both menus come
from one shared definition (`components/dashboard/admin-nav-groups.ts`), so
they can't drift apart. Each app screen lives at the web path without
`/dashboard` (`/dashboard/admin/users` becomes `/admin/users`); Overview is the
app's Home. Account (app lock, legal pages) and Sign out sit at the bottom of
the drawer.

Every action on a web page (create, edit, assign, reschedule, cancel, payment
links, moderation, sending a newsletter and so on) is available on the matching
app screen.

## What already exists

- **Native shells:** `client/android-admin/` and `client/ios-admin/`, app ID
  `ca.baydspa.admin`, name "BAYD Admin", served from `m-admin.baydspa.ca`
  (already allowed by CORS and ActionCable).
- **Build target:** `scripts/build-mobile.mjs admin` builds the `app/admin`
  route tree with `/admin` as the entry. The tree has no screens yet.
- **API:** every endpoint the web admin dashboard uses (`/api/v1/admin/*` and
  `/api/v1/super/*`), so the app needs no new endpoints for parity.
- **Push:** `NotificationService` already sends phone push to admins with a
  device token. Admin alerts currently carry the staff app's job link
  (`push_path` sends every non-customer to `/staff/schedule/job`), so the admin
  app needs its own links.
- **Rate limits:** counted per account (300 calls a minute), so the app won't
  be throttled.

## Build steps (Phase 11)

Each step is built against the matching web pages and is done only when every
action on those pages works in the app, tested on your phone against the local
API.

- **11a. Shell:** `app/admin` route tree, sign-in (staff password flow), role
  gate (admins and super admins only), the hamburger menu, "Working in" switcher
  for super admins, app lock, push token registration and admin deep links, and a
  debug-only cleartext manifest for local phone testing.
- **11b. Home and Bookings:** overview, analytics, bookings list and calendar,
  booking and visit pages with every action, new booking, booking requests,
  subscriptions, work-scope calls.
- **11c. People:** customers, employees (detail, hours, add and edit staff),
  partners, jobs and applications, staff map, fuel and shifts.
- **11d. Inbox:** messages, support chat, chat reports, notifications,
  inquiries, callbacks.
- **11e. Catalog and Commerce:** services, products, orders, invoices, gift
  cards, loyalty, tips.
- **11f. Content and Settings:** blog posts and comments, gallery, reviews,
  newsletter, service areas, payments, royalties.
- **11g. Franchise console (super admin):** franchises list, new franchise,
  setup, payment keys, catalog copy, admins, legal, go live and suspend, all
  branches, royalties.
- **11h. Parity check and store:** a page-by-page sweep of web vs app for both
  roles (the same sweep used on the web dashboard), then private distribution
  (Apple Business Manager custom app, Managed Google Play private app), review
  notes, screenshots and the demo account.

## Order and dependencies

1. Phases 9 and 10 (multi-service visits, franchising, dashboard fixes) are on
   `feature/09-multi-service-bookings`, not in production. The app needs them
   live, so they ship first, on your explicit go-ahead.
2. Build and test locally on your phone (`bin/dev`, `adb reverse`,
   `MOBILE_API_URL`), step by step, never on an emulator.
3. Then store builds and private distribution.

## Defaults I'll use unless you say otherwise

1. **Admin push alerts:** the same alerts admins already get in the dashboard
   (late or missed bookings, failed no-show charges, chat reports, support
   messages, callback and phone booking requests), opening the matching app
   screen.
2. **App Review demo:** a reviewer must not see real customers, so the review
   account is a demo admin in a separate demo franchise (kept suspended, so
   customers never see it) with sample bookings.
