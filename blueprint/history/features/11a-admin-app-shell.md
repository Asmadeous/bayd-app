# Feature: Admin app shell

**From build-plan:** feature 11a (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

The BAYD Admin app opens, signs an admin or super admin in, and shows the
hamburger menu (the web sidebar's sections) the rest of Phase 11 fills in. Super admins pick the franchise they work in,
the same "Working in" choice as the web dashboard.

## In scope

- `client/app/admin` route tree: layout with sign-in gate (admins and super
  admins only), app lock, hamburger menu with the web sidebar's groups (one
  shared definition), unbuilt sections greyed.
- `/admin/welcome` sign-in (staff password flow); anyone who isn't an admin is
  told the app is for admins and signed out.
- Drawer: "Working in" switcher (super admins), Account (app lock, legal),
  sign out. Home says Overview arrives in 11b.
- Push: the admin app opens a booking alert in its own booking screen (pushes
  for admins carry the staff job link today).
- `build-mobile.mjs admin` lands on `/admin/home`; debug-only cleartext manifest
  in `android-admin` for local testing.

## Out of scope

- The screens behind each menu section (11b to 11g).
- iOS builds and store work (11h).

## Build steps

- [x] **Step 1 - Route tree and sign-in** - layout gate, welcome screen,
  hamburger menu, admin theme/header. *Done when:* tsc + lint green; non-admins are refused.
- [x] **Step 2 - Drawer and Account** - switcher, account, app lock, legal,
  sign out.
  *Done when:* switching franchise changes the `X-Franchise` the app sends.
- [x] **Step 3 - Push links and build** - push path mapping, build entry, debug
  manifest; build and install on the phone against the local API. *Done when:*
  admin and super admin sign in on the phone, compared side by side with the web
  dashboard.

## As built

- Navigation is a hamburger drawer, not bottom tabs (your call). Its menu comes
  from `components/dashboard/admin-nav-groups.ts`, the same definition the web
  sidebar now uses, so both list the same groups and sections in the same
  order. Sections not built yet show greyed with "Soon"; unread counts show as
  on the web.
- App screens live at the web path without `/dashboard` (Overview is
  `/admin/home`).
- The site's support chat bubble is hidden in the admin app.
- Tested on your phone against the local API: the seed admin (no "Working in",
  no Franchises group) and a temporary super admin ("Working in" picker,
  Franchises group first; switching to the UK test branch changed the branch
  the app works in), each compared side by side with the web sidebar.

## Notes for the AI

- Parity rule: the app does everything the web admin dashboard does; nothing is
  view-only or web-only (memory: no-admin-mobile-app).
- The mobile build stashes every `app/` tree except the one being built, so the
  admin tree must not import from `app/staff`.
- Test on the phone against the local API only (never an emulator); no store builds
  and no production deploys without an explicit yes.
