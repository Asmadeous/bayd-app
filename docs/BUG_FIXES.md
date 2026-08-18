# Bug Fixes

This file is the running record of bugs investigated and fixed in the project.
Each entry should describe the user-visible symptom, the technical cause, the
scope of the fix, and how the result was verified.

## Bug-fix entry template

### YYYY-MM-DD — Short bug title

- **Branch:** `bugfix/example-name`
- **Area:** frontend / backend / database / infrastructure
- **Reported behavior:** What the user saw.
- **Expected behavior:** What should have happened.
- **Root cause:** The specific technical cause, including relevant files or endpoints.
- **Fix:** What was changed and why.
- **Verification:** Tests or manual checks performed.
- **Follow-up:** Any related issue intentionally left for a separate change.

---

## 2026-08-18 — Admin customer-to-employee role change showed no error

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and user-role backend behavior
- **Reported behavior:** Changing a customer’s role to `employee` appeared to do nothing. Changing the same customer to `admin` worked.
- **Expected behavior:** The admin should see a clear error when the requested role change is rejected, while the role editor remains open so the request can be corrected.
- **Root cause:** `client/app/dashboard/admin/users/page.tsx` submitted the role update but did not define an `onError` handler for the React Query mutation. The API response was therefore rejected without being shown in the UI. The backend `User` model also validates that employee emails end in `@baydspa.ca`, so customer emails from other domains are rejected when promoted to employee. The admin user update endpoint changes only `User#role`; it does not create an `EmployeeProfile`.
- **Fix:** Added mutation error handling that displays the API’s `error` or `errors` response in a BAYD-styled toast and accessible inline error banner. The Save button now indicates the pending state, and the editor stays open after a failed update. The toast provider is global so future admin and staff actions can use the same notification pattern.
- **Verification:** Confirmed the frontend sends `{ role }` to `PATCH /api/v1/admin/users/:id`; confirmed the backend returns validation errors through `ActiveRecord::RecordInvalid`; verified the changed frontend path has no unhandled role-update failure state.
- **Follow-up:** Employee promotion still requires a backend workflow decision: either enforce the company-domain requirement with a clear UI path or use the dedicated employee creation flow, which also creates an `EmployeeProfile`.

### Toast setup note

The project now uses shadcn’s Radix toast primitive via `@radix-ui/react-toast`, with a custom `BaydToastProvider` in `client/components/bayd-toast-provider.tsx`. If the development server is running during dependency installation, stop it first so npm can update the `client/node_modules` tree cleanly, then run `npm install` from `client/`.

---

## 2026-08-18 — `bin/dev` could not find Next.js

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Frontend dependency installation
- **Reported behavior:** `bin/dev` failed with `sh: 1: next: not found`, although the Next package directory existed.
- **Root cause:** An interrupted npm install left Next’s executable as a temporary `.next-*` symlink inside `client/node_modules/.bin` instead of the expected `next` symlink.
- **Fix:** Restored the generated `client/node_modules/.bin/next` link to `../next/dist/bin/next`.
- **Verification:** `client/node_modules/.bin/next --version` returns `Next.js v16.2.7`.
- **Follow-up:** If npm installation is interrupted again, stop `bin/dev` before reinstalling and remove stale hidden staging directories under `client/node_modules/@img` or other affected package folders.

---

## 2026-08-18 — `bin/dev` stopped after Next printed Ready

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Frontend dependency installation and development startup
- **Reported behavior:** `bin/dev` started Rails and Next, Next printed `Ready`, then `client.1` exited with code `0`. Foreman then terminated Rails.
- **Expected behavior:** `bin/dev` should keep both Rails on `3000` and Next on `3003` running until the developer stops the process.
- **Root cause:** npm installed Next `16.3.0` because `package.json` allowed a floating `^16.3.0` range. In this environment, `next dev` on `16.3.0` exited cleanly immediately after startup. The project’s lint config was still on `eslint-config-next` `16.2.7`, and the previously working dev server was Next `16.2.7`.
- **Fix:** Pinned `next` and `eslint-config-next` exactly to `16.2.7`, refreshed `client/package-lock.json`, removed stale npm staging directories left by interrupted installs, and kept `Procfile.dev` pointed directly at the local Next executable on port `3003`.
- **Verification:** `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1 ./node_modules/.bin/next dev -p 3003` stayed alive until a 12-second timeout stopped it. `bin/dev` also stayed alive until timeout, with Rails listening on `3000` and Next listening on `3003`.
- **Follow-up:** Avoid broad Next version ranges until upgrades are tested through `bin/dev`; npm install interruptions can leave hidden `node_modules/.package-*` staging directories that must be removed before retrying.

---

## 2026-08-18 — Fuel compensation filters used native date inputs

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend
- **Reported behavior:** The Fuel Compensation page used plain browser date inputs for the `From` and `To` filters.
- **Expected behavior:** The date filters should use the app's shadcn-style calendar picker for a consistent dashboard experience.
- **Root cause:** `client/app/dashboard/admin/shifts/page.tsx` rendered inline `<input type="date">` controls instead of the shared UI date picker.
- **Fix:** Added reusable shadcn-style `Calendar` and `Popover` UI primitives, upgraded `DatePicker` to use a calendar popover, and replaced the Fuel Compensation `From` and `To` fields with `DatePicker`. The `To` picker now respects the selected `From` date as its minimum.
- **Verification:** Targeted ESLint passed for the fuel page, upgraded date picker, new calendar/popover primitives, and the existing gift-card form that also uses `DatePicker`.
- **Follow-up:** Other dashboard pages with native date inputs should migrate to the same shared `DatePicker` as they are touched.

---

## 2026-08-18 — Service catalog delete used browser confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend
- **Reported behavior:** Deleting a service from the catalog used the browser's default confirmation dialog.
- **Expected behavior:** Destructive service deletion should use a branded, accessible shadcn-style alert dialog.
- **Root cause:** `client/app/dashboard/admin/services/page.tsx` called `confirm(...)` directly from the Delete button.
- **Fix:** Added a reusable `AlertDialog` primitive backed by `@radix-ui/react-alert-dialog` and replaced the service delete browser confirm with a modal confirmation that names the service and explains the booking impact.
- **Verification:** Targeted ESLint passed for the services page and the new alert dialog component.
- **Follow-up:** Other admin delete flows still using `confirm(...)` should migrate to the same shared alert dialog as they are touched.

---

## 2026-08-18 — New service form did not show validation errors

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and service catalog validation
- **Reported behavior:** The New Service form could submit incomplete or invalid service data without showing useful field-level feedback.
- **Expected behavior:** Required fields and invalid values should be caught before submission, backend validation errors should be visible, and the editor should stay open so the admin can correct the form.
- **Root cause:** `client/app/dashboard/admin/services/page.tsx` stored raw form state and submitted directly to the API. The backend had model validations, but the frontend had no schema, no inline errors, and no mutation `onError` handling.
- **Fix:** Added a Zod schema for service form validation, inline field errors, error styling, mutation error handling, and BAYD toast notifications for both create and update failures. Required fields now include name, price, duration, and category; price tiers and image URL are validated when present.
- **Verification:** Targeted ESLint passed for the services page.
- **Follow-up:** Consider extracting shared admin form primitives if more catalog forms get field-level validation.

---

## 2026-08-18 — Service editor rendered inline instead of a modal

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend
- **Reported behavior:** Creating or editing a service opened a large inline editor panel above the catalog list, pushing page content around.
- **Expected behavior:** The service editor should open as a dialog/modal so admins can edit from anywhere on the catalog page without losing table context.
- **Root cause:** `client/app/dashboard/admin/services/page.tsx` rendered the create/edit form directly inside a `DashboardPanel` controlled by the `modal` state.
- **Fix:** Added a reusable shadcn-style `Dialog` primitive backed by `@radix-ui/react-dialog` and moved the validated service create/edit form into a centered, scrollable modal with a header, body, footer, close button, and existing validation/error behavior.
- **Verification:** Targeted ESLint passed for the services page and the new dialog component.
- **Follow-up:** Other large inline admin editors can migrate to the shared dialog when their workflows are touched.
