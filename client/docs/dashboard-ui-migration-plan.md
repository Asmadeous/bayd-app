# Dashboard UI Migration Plan

## Goal

Bring this app's customer, employee, and admin dashboards in line with the upgraded dashboard UI from `/home/ajogu/documents/bayd`, while keeping this migration frontend-only.

Do not change backend controllers, serializers, models, migrations, or API behavior as part of this UI migration. Preserve this app's newer routes and data fields.

## Reference Project

Reference source:

```text
/home/ajogu/documents/bayd
```

Primary reference areas:

```text
client/app/dashboard
client/components/dashboard
client/features/auth
client/components/ui
docs/dashboard-design-plan.md
```

## Progress

- [x] Discovery and route comparison
- [x] Store implementation plan in `client/docs`
- [x] Phase 1: dashboard shell foundation
- [x] Phase 2: shared dashboard UI primitives
- [x] Phase 3: role overview pages
- [x] Phase 4: shared cards and calendar
- [x] Phase 5: dense admin workflow pages
- [x] Phase 6: customer workflow pages
- [x] Phase 7: employee workflow pages
- [ ] Phase 8: auth UI merge
- [x] Phase 9: polish and QA

## Findings

The reference project has upgraded dashboard primitives that this app was missing:

- `dashboard-page.tsx`
- `dashboard-hero.tsx`
- `dashboard-panel.tsx`
- `dashboard-toolbar.tsx`
- `data-table.tsx`
- `empty-state.tsx`
- `metric-card.tsx`
- `status-badge.tsx`

The reference project also upgraded:

- Dashboard layout, sidebar, header, stat cards, booking cards, and calendar
- Customer overview and customer workflow pages
- Employee overview, profile, and reviews pages
- Many admin pages, including bookings, services, products, users, employees, orders, booking requests, and others
- Auth pages with stronger validation, field errors, success/error messaging, and image upload-style UI

This app has additional routes not present in the reference project:

- `client/app/dashboard/admin/callbacks/page.tsx`
- `client/app/dashboard/admin/meetings/page.tsx`
- `client/app/dashboard/admin/partners/page.tsx`
- `client/app/dashboard/admin/settings/page.tsx`
- `client/app/dashboard/admin/shifts/page.tsx`
- `client/app/dashboard/admin/tips/page.tsx`
- `client/app/dashboard/employee/shifts/page.tsx`

These app-only pages should be restyled manually with the new shared primitives.

## Implementation Phases

### Phase 1: Dashboard Shell Foundation

Files:

- `client/app/dashboard/layout.tsx`
- `client/components/dashboard/sidebar.tsx`
- `client/components/dashboard/dashboard-header.tsx`

Work:

- Expand dashboard content width to match the upgraded operational canvas.
- Use the warmer branded loading state.
- Upgrade sidebar to the dark editorial style with Lucide icons, grouped navigation, mobile drawer behavior, user identity block, and role badge.
- Preserve this app's complete route list, including admin callbacks, meetings, partners, settings, shifts, tips, and employee shifts.
- Upgrade `DashboardHeader` to the branded header surface.

### Phase 2: Shared Dashboard UI Primitives

Files:

- `client/components/dashboard/dashboard-page.tsx`
- `client/components/dashboard/dashboard-hero.tsx`
- `client/components/dashboard/dashboard-panel.tsx`
- `client/components/dashboard/dashboard-toolbar.tsx`
- `client/components/dashboard/data-table.tsx`
- `client/components/dashboard/empty-state.tsx`
- `client/components/dashboard/metric-card.tsx`
- `client/components/dashboard/status-badge.tsx`

Work:

- Add the missing reusable dashboard components from the reference project.
- Keep APIs simple so pages can migrate gradually.

### Phase 3: Role Overview Pages

Files:

- `client/app/dashboard/customer/page.tsx`
- `client/app/dashboard/employee/page.tsx`
- `client/app/dashboard/admin/page.tsx`

Work:

- Move overview pages to `DashboardPage`, `DashboardHero`, `DashboardPanel`, `MetricCard`, `EmptyState`, and upgraded `BookingCard` patterns.
- Preserve existing hooks and data behavior.

### Phase 4: Shared Cards And Calendar

Files:

- `client/components/dashboard/stat-card.tsx`
- `client/components/dashboard/booking-card.tsx`
- `client/components/dashboard/app-calendar.tsx`

Work:

- Upgrade shared card/calendar visuals.
- Preserve existing prop APIs where possible.
- Keep recurrence, meeting, client type, and action behavior visible where this app currently supports them.

### Phase 5: Dense Admin Workflow Pages

Start with pages that closely match the reference:

- `admin/bookings`
- `admin/booking-requests`
- `admin/services`
- `admin/products`
- `admin/users`
- `admin/employees`
- `admin/orders`

Then continue through:

- `admin/invoices`
- `admin/reviews`
- `admin/gallery`
- `admin/blog`
- `admin/newsletter`
- `admin/service-areas`
- `admin/subscriptions`
- `admin/gift-cards`
- `admin/loyalty`
- `admin/jobs`
- `admin/inquiries`
- `admin/analytics`
- `admin/calendar`

Finally restyle app-only admin routes:

- `admin/callbacks`
- `admin/meetings`
- `admin/partners`
- `admin/settings`
- `admin/shifts`
- `admin/tips`

### Phase 6: Customer Workflow Pages

Files:

- `customer/book`
- `customer/bookings`
- `customer/calendar`
- `customer/orders`
- `customer/addresses`
- `customer/settings`
- `customer/notifications`
- `customer/subscriptions`
- `customer/gift-cards`
- `customer/loyalty`
- `customer/transactions`

Work:

- Make booking flow feel premium and guided.
- Improve form hierarchy and responsive behavior.
- Standardize account pages with shared panels, toolbars, empty states, and status badges.

### Phase 7: Employee Workflow Pages

Files:

- `employee/page.tsx`
- `employee/profile/page.tsx`
- `employee/reviews/page.tsx`
- `employee/shifts/page.tsx`

Work:

- Make schedule, shift state, reviews, and profile editing match the upgraded dashboard system.
- Keep employee mobile usability practical.

### Phase 8: Auth UI Merge

Files:

- `client/features/auth/components/auth-page.tsx`
- `client/features/auth/data.ts`
- `client/features/auth/types.ts`
- `client/features/auth/components/google-sign-in.tsx`

Work:

- Merge the reference project's improved auth presentation, validation, field error messaging, and success/error states.
- Preserve this app's signup address fields, special-needs checkbox, dummy/social changes, password visibility toggle, and API fixes.

### Phase 9: Polish And QA

Work:

- Run targeted ESLint after each batch.
- Run TypeScript/build checks after major batches.
- Smoke-test representative admin, customer, and employee routes.
- Check mobile and desktop layouts.
- Keep documenting completed batches and any known risks in this file.

## Current Notes

- This is UI-only work.
- Existing dirty worktree changes are present from earlier content/auth fixes and must not be reverted.
- `db/schema.rb` has a pre-existing unrelated diff and should not be touched by this migration.

## Implementation Log

### 2026-08-06: Foundation Batch

Completed:

- Added shared dashboard primitives:
  - `dashboard-page.tsx`
  - `dashboard-hero.tsx`
  - `dashboard-panel.tsx`
  - `dashboard-toolbar.tsx`
  - `data-table.tsx`
  - `empty-state.tsx`
  - `metric-card.tsx`
  - `status-badge.tsx`
- Updated dashboard shell:
  - wider dashboard layout
  - branded loading state
  - upgraded mobile-aware dark sidebar
  - upgraded shared dashboard header
- Preserved this app's full route set in the new sidebar, including callbacks, meetings, partners, payments, shifts, tips, and customer/employee calendar routes.
- Upgraded shared dashboard cards:
  - `StatCard`
  - `BookingCard`
  - `AppCalendar`
- Preserved this app's booking `client_type` badge in the upgraded `BookingCard`.

Verification:

- Targeted ESLint passed for the new primitives, dashboard shell, header, sidebar, stat card, booking card, and calendar.

### 2026-08-06: Role Overview Batch

Completed:

- Migrated role overview pages to the upgraded dashboard UI system:
  - `client/app/dashboard/customer/page.tsx`
  - `client/app/dashboard/admin/page.tsx`
  - `client/app/dashboard/employee/page.tsx`
- Added dashboard heroes, stronger metric cards, dashboard panels, upgraded empty states, and improved schedule/booking presentation.
- Preserved existing data hooks and role routing behavior.
- Updated copied reference brand text to `Beauty @ Your Door`.

Verification:

- Targeted ESLint passed for the three migrated overview pages.

Known blocker:

- Full `./node_modules/.bin/tsc --noEmit` is currently blocked by the existing missing `lucide-react` declaration file issue in `node_modules`. The package declares `dist/lucide-react.d.ts`, but that file is not present in the installed package. This was already blocking production build checks before the dashboard migration.

### 2026-08-06: Dashboard Workflow Migration Batch

Completed:

- Migrated dense admin workflow pages to the upgraded dashboard UI:
  - bookings, booking requests, users, orders
  - services and products, while preserving this app's `image_url`, SimplyBook service ID, and service tier pricing behavior
  - employees, while preserving create/edit/delete, temporary password entry, partner assignment, service FSA editing, and KPI links
  - analytics, invoices, reviews, gallery, blog, newsletter, service areas, subscriptions, gift cards, loyalty, jobs, inquiries, and calendar
- Restyled app-only admin routes that do not exist in the reference project:
  - callbacks
  - work-scope calls
  - partners
  - settings
  - fuel compensation and shifts
  - tips owed
- Migrated customer workflow pages:
  - book, bookings, calendar, orders, addresses, settings, notifications, subscriptions, gift cards, loyalty, and transactions
- Migrated employee workflow pages:
  - profile
  - reviews
  - shifts
- Added small compatible UI primitives needed by the migrated pages:
  - `client/components/ui/select.tsx`
  - `client/components/ui/date-picker.tsx`
  - `client/components/ui/sheet.tsx`
- Kept this migration frontend-only. No backend API, model, serializer, route, or migration changes were made for this dashboard batch.
- Rechecked copied reference content so the visible organization signature remains `Beauty @ Your Door`.

Verification:

- `npm exec eslint app/dashboard components/dashboard components/ui/date-picker.tsx components/ui/select.tsx components/ui/sheet.tsx` passes with no errors or warnings.
- `npm exec tsc --noEmit` still fails only on the existing local `lucide-react` declaration-file issue described above. The copied dashboard pages no longer report missing `select`, `date-picker`, or `sheet` component errors.

Deferred:

- Phase 8 auth UI merge remains separate from the dashboard migration. Earlier auth fixes and password visibility toggles are already in place, but the full reference auth presentation merge has not been started in this dashboard batch.
