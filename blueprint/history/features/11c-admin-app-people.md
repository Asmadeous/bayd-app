# Feature: Admin app - People

**From build-plan:** feature 11c (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

The admin app's People and Operations sections do everything the web
dashboard's do: Customers, Employees (staff screen, hours, add and edit staff,
detailed KPIs), Partners, Jobs and applications, Fuel & shifts and the Staff
map, laid out for a phone.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin/users` | `/admin/users` | email search, role filter, pages |
| (user row actions) | `/admin/users/view?id=` | change role, message, delete |
| `/dashboard/admin/employees` | `/admin/employees` | KPI period, status badges, Add staff |
| (employee card actions) | `/admin/employees/view?id=` | toggle shift, edit, hours, delete, partner, service areas, KPIs |
| `/dashboard/admin/employees/detail` | `/admin/employees/detail?id=` | detailed KPIs |
| `/dashboard/admin/partners` | `/admin/partners` | partners with owed now, Add |
| (partner card actions) | `/admin/partners/view?id=` | providers, settle, payouts, mark paid, edit, delete |
| (partner dialog) | `/admin/partners/edit` | new and edit, same rules |
| `/dashboard/admin/jobs` | `/admin/jobs` | postings (new, edit, delete) and applications (hire, status, documents) |
| `/dashboard/admin/shifts` | `/admin/shifts` | filters, totals, delete |
| `/dashboard/admin/staff-locations` | `/admin/staff-locations` | live fleet map, distance, fuel owed |

The editors move out of the web pages into shared components so both use the
same rules: `StaffFormDialog`, `StaffCoverageEditor`
(`components/dashboard/staff-editor.tsx`), `PartnerDetail`, `lib/partner-form`,
`JobPostingEditor` and `ScanBadge`. The app also reuses `StaffHoursSheet`,
`HireApplicantButton` and `FleetMap` (new optional `heightClass`).

## Out of scope

- Other menu sections (11d to 11g).

## Build steps

- [x] **Step 1 - Shared editors** - move the staff, partner and job editors out
  of the web pages; the web pages behave the same. *Done when:* tsc + lint
  green.
- [x] **Step 2 - Customers** - list and account screen.
- [x] **Step 3 - Employees** - list, staff screen, detailed KPIs.
- [x] **Step 4 - Partners** - list, partner screen, new and edit.
- [x] **Step 5 - Jobs** - postings and applications.
- [x] **Step 6 - Fuel & shifts and Staff map**
- [x] **Step 7 - Phone check** - build, install on the phone and compare every
  screen with the web. *Done when:* each screen matches its web page.

## As built

- Customers, Employees (list, staff screen, detailed KPIs), Partners (list,
  partner screen, new and edit), Jobs (postings and applications), Fuel &
  shifts and Staff map, each compared with its web page on your phone.
- The editors moved out of the web pages into shared components the web and
  the app both use: `StaffFormDialog` and `StaffCoverageEditor`
  (`components/dashboard/staff-editor.tsx`), `PartnerDetail`,
  `lib/partner-form`, `JobPostingEditor` and `ScanBadge`. The app also reuses
  `StaffHoursSheet`, `HireApplicantButton` and `FleetMap` (new optional
  `heightClass`). New `useAdminEmployee(id)` hook.
- App helpers: `app/admin/ui.tsx` (filter chips, pager, empty card).
- Fixed on the phone: staff photos and gallery images were blank in the app
  (root-relative image paths); they now go through `assetUrl`, as the staff
  app does. Dark stat cards rendered white on white; fixed with `cn()`.
- Open, on hold by the user: job application document downloads use a blob
  download the Android WebView ignores (see the 11e note on invoice PDFs).

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
- Add each finished screen to `BUILT` in `app/admin/built.ts`.
- The admin tree must not import from other `app/` trees (the mobile build
  stashes them); shared code lives in `components/` and `lib/`.
- Test on the phone against the local API; never an emulator; check the app is
  in front before each tap.
