# Feature: Admin app - Franchise console

**From build-plan:** feature 11g (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

The super admin's franchise console in the admin app: franchises, new
franchise, each franchise's setup, Square keys, service menu copy, admins,
legal pages, go live and suspend, all branches and royalties.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin/franchises` | `/admin/franchises` | status and readiness per branch |
| `/dashboard/admin/franchises/new` | `/admin/franchises/new` | the same setup form, starts as a draft |
| `/dashboard/admin/franchises/view` | `/admin/franchises/view?id=` | go live or suspend, then every section of the web page |
| `/dashboard/admin/branches` | `/admin/branches` | each franchise side by side for a month |
| `/dashboard/admin/royalties` | `/admin/royalties` | built in 11f, role-conditional |

## Build steps

- [x] **Step 1 - Shared sections** - the franchise page's sections moved to
  `components/dashboard/franchise-sections.tsx` (`FranchiseSections`,
  `FranchiseStatusButton`, `franchiseSubtitle`); the web page uses them.
- [x] **Step 2 - App screens** - behind `SuperGate` (`app/admin/super-gate.tsx`).
- [x] **Step 3 - Phone check** - signed in as a temporary local super admin,
  deleted afterwards.

## As built

- Every screen compared with its web page on your phone, plus the drawer's
  "Working in" for super admins.
- With 11g every one of the 36 menu items has an app screen.

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
