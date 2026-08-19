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

---

## 2026-08-18 — Product catalog editor lacked validation, modal editing, and branded delete confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and product catalog backend
- **Reported behavior:** The Products admin page still used the older inline editor, browser confirmation for deletes, and no visible validation or backend error handling.
- **Expected behavior:** Product create/edit should match the improved Services workflow: modal editor, client-side validation, inline errors, toast feedback, and a shadcn-style destructive confirmation.
- **Root cause:** `client/app/dashboard/admin/products/page.tsx` submitted raw form state directly to the API, rendered the form in an inline `DashboardPanel`, and used `confirm(...)` before deletion. The admin product API also accepted `stock_qty` even though the model/schema use `stock_quantity`.
- **Fix:** Added a Zod product form schema, inline field errors, mutation error handling, BAYD toast feedback, modal create/edit using the shared `Dialog`, delete confirmation using the shared `AlertDialog`, and normalized the admin product stock field to `stock_quantity` while preserving backend compatibility for the old `stock_qty` key.
- **Verification:** Targeted ESLint passed for the products page. Ruby syntax check passed for `app/controllers/api/v1/admin/products_controller.rb`.
- **Follow-up:** Product category remains optional because the backend model allows it; make it required only if the product workflow needs that rule.

---

## 2026-08-18 — Manual invoice form was inline and lightly validated

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and invoice workflow
- **Reported behavior:** The Manual Invoice form opened inline, relied on placeholders instead of standard labels, and only disabled submit for a missing customer ID or total. API failures were not surfaced clearly.
- **Expected behavior:** Manual invoice creation should use a standard dialog, labeled fields, client-side validation, inline errors, toast feedback, and visible backend error handling.
- **Root cause:** `client/app/dashboard/admin/invoices/page.tsx` rendered `ManualInvoiceForm` as an inline `DashboardPanel` and submitted raw form values with minimal checks. Invoice delete also used `confirm(...)`.
- **Fix:** Moved manual invoice creation into the shared `Dialog`, added a Zod validation schema, converted placeholders into labeled fields, added inline errors and BAYD toast feedback, handled backend save errors, auto-calculated total from subtotal plus tax, improved amount calculation for line items, and replaced invoice delete with the shared `AlertDialog`.
- **Verification:** Targeted ESLint passed for the invoices page.
- **Follow-up:** Customer selection still uses a numeric user ID. A searchable customer picker would be a better long-term admin workflow.

---

## 2026-08-19 — Gift card form lacked validation and used browser delete confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and gift card workflow
- **Reported behavior:** The admin Gift Cards page used an inline issue form with placeholder-only fields and no visible client-side validation. Deleting a gift card used the browser’s native confirmation alert.
- **Expected behavior:** Gift card issuing should use a standard dialog with clear labels, field-level validation, visible backend errors, and toast feedback. Gift card deletion should use the shared shadcn-style destructive confirmation.
- **Root cause:** `client/app/dashboard/admin/gift-cards/page.tsx` submitted raw form state directly to the API and rendered the form inline. The delete button called `confirm(...)` directly instead of the shared `AlertDialog` primitive.
- **Fix:** Moved gift card issuing into the shared `Dialog`, added a Zod validation schema for amount, expiration date, and recipient email, converted placeholders into labels, added inline errors and BAYD toast feedback, normalized the create payload, and replaced the delete browser confirmation with the shared `AlertDialog`.
- **Verification:** Targeted ESLint passed for the gift cards page. `git diff --check` passed.
- **Follow-up:** The top-up mini form still only guards invalid amounts by disabling behavior; it can receive the same field-level validation treatment if staff payment flows need stricter visible feedback.

---

## 2026-08-19 — Blog post editor was inline and publish actions lacked confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and blog post admin API
- **Reported behavior:** Blog post creation and editing happened inside a large inline panel on the list page. Publish and unpublish changed public visibility immediately, and delete still used native browser confirmation.
- **Expected behavior:** Blog create/edit should use focused pages because blog posts are long-form content. Publish, unpublish, and delete should require branded shadcn-style confirmation alerts before changing public visibility or removing content.
- **Root cause:** `client/app/dashboard/admin/blog/page.tsx` owned both list and editor state, submitted lightly validated form state, and called mutations directly from row buttons. The delete flow still used `confirm(...)`. The admin blog API also did not permit the existing `category` column, so category could not be saved from the admin editor.
- **Fix:** Replaced the inline editor with dedicated `/dashboard/admin/blog/new` and `/dashboard/admin/blog/:id/edit` pages, added a reusable validated blog post form with inline errors and BAYD toast feedback, added shadcn `AlertDialog` confirmations for publish, unpublish, and delete, and permitted `category` in the admin blog post controller.
- **Verification:** Targeted ESLint passed for the blog list, new-post page, edit-post page, and shared blog form. Ruby syntax check passed for the admin blog posts controller. `git diff --check` passed.
- **Follow-up:** The cover image workflow currently uses a URL field. If direct image uploads are required, the backend needs an explicit Active Storage attachment or upload endpoint for blog covers.

---

## 2026-08-19 — Gallery form was inline, lightly validated, and used browser delete confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and gallery workflow
- **Reported behavior:** The Gallery admin page used a large inline add/edit form, submitted lightly validated form state, had misleading image upload/drop UI without backend upload handling, and used the browser’s native delete confirmation.
- **Expected behavior:** Gallery add/edit should use the shared dialog pattern, show field-level validation and toast feedback, align category choices with backend validations, and confirm destructive deletes with the shared shadcn-style alert dialog.
- **Root cause:** `client/app/dashboard/admin/gallery/page.tsx` owned all editor state inline, sent raw payloads directly to the API, included a frontend-only upload UI while the backend only accepts `image_url`, and called `confirm(...)` before deletion. The frontend category list also included `Waxing`, while `GalleryItem::CATEGORIES` allows `Team`, `Lashes`, `Nails`, `Pedicure`, and `Massage`.
- **Fix:** Moved gallery add/edit into the shared `Dialog`, added a Zod validation schema, inline field errors, BAYD toast feedback for save/delete failures, image URL preview instead of unsupported file upload UI, category options aligned to the backend model, and a shadcn `AlertDialog` for delete confirmation.
- **Verification:** Targeted ESLint passed for the gallery page. `git diff --check` passed.
- **Follow-up:** Real image upload support remains intentionally out of scope until the backend has an explicit upload/attachment implementation for gallery images.

---

## 2026-08-19 — Newsletter subscriber removal used browser confirmation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and newsletter workflow
- **Reported behavior:** Removing a newsletter subscriber used the browser’s native confirmation dialog and did not show branded success or failure feedback.
- **Expected behavior:** Subscriber removal should use the shared shadcn-style destructive confirmation and show clear toast feedback after success or API failure.
- **Root cause:** `client/app/dashboard/admin/newsletter/page.tsx` called `confirm(...)` directly from the Remove button and only invalidated the subscriber query after deletion.
- **Fix:** Replaced the browser confirmation with the shared `AlertDialog`, included the subscriber email in the confirmation copy, and added BAYD toast feedback for successful and failed removals.
- **Verification:** Targeted ESLint passed for the newsletter page. `git diff --check` passed.
- **Follow-up:** None.

---

## 2026-08-19 — Service area editor was inline and implied radius controlled booking coverage

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and service area workflow
- **Reported behavior:** Editing a service area opened an inline form with no client-side validation, no visible API error handling, and copy that described latitude/longitude/radius as the bookable circular zone.
- **Expected behavior:** Service area editing should use the shared dialog pattern, validate field values before save, show inline and toast errors, and avoid implying radius controls bookings when current backend coverage is postal-code based.
- **Root cause:** `client/app/dashboard/admin/service-areas/page.tsx` submitted raw inline form values directly to the update hook and used helper text that did not match `ServiceArea.covers?`, which checks configured postal codes rather than radius metadata.
- **Fix:** Moved service area editing into the shared `Dialog`, added Zod validation for name, travel fee, latitude, longitude, and radius, added inline field errors and BAYD toast feedback, and updated helper/list copy to describe radius as map metadata while showing postal-code coverage count.
- **Verification:** Targeted ESLint passed for the service areas page. `git diff --check` passed.
- **Follow-up:** Create/delete service area workflows remain intentionally out of scope because they need slug handling and coverage/employee-assignment decisions.

---

## 2026-08-19 — Employee editor was inline and staff actions lacked branded errors

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and employee workflow
- **Reported behavior:** Adding or editing staff used a large inline panel with minimal validation. Deleting staff used the browser confirmation dialog and API failures were shown with `alert()`. Partner, shift, and coverage updates could fail without consistent visible feedback.
- **Expected behavior:** Staff editing should use the shared dialog pattern, validate fields before submission, keep backend errors visible, and use branded confirmation/toast feedback for staff actions.
- **Root cause:** `client/app/dashboard/admin/employees/page.tsx` submitted raw staff form values directly to the API, rendered the form inline, used native `confirm()`/`alert()` for deletion, and silently discarded invalid FSA coverage entries.
- **Fix:** Moved staff create/edit into the shared `Dialog`, added a Zod staff schema with company-domain email, optional password, and coordinate validation, added inline field errors and BAYD toast feedback, replaced staff deletion with the shared `AlertDialog`, surfaced partner/shift/FSA mutation failures through toasts, and made FSA editing reject invalid entries instead of silently dropping them.
- **Verification:** Targeted ESLint passed for the employees page and shared admin hook types. `git diff --check` passed.
- **Follow-up:** Staff service assignment remains separate from FSA coverage; add a dedicated service picker if admins need to manage provider-service eligibility from this page.

---

## 2026-08-19 — Partner editor and payout actions lacked validation and confirmations

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and partner workflow
- **Reported behavior:** Partner create/edit used an inline form with only a disabled Save button for missing names. Deleting partners used the browser confirmation dialog. Creating payouts and marking payouts paid happened immediately, and API failures were not surfaced consistently.
- **Expected behavior:** Partner editing should use the shared dialog pattern with field-level validation and visible API errors. Partner deletion and payout status changes should use branded confirmations and toast feedback.
- **Root cause:** `client/app/dashboard/admin/partners/page.tsx` submitted raw partner form values directly to mutations, rendered the editor inline, used native `confirm(...)` for deletion, and called payout mutations directly from buttons.
- **Fix:** Moved partner create/edit into the shared `Dialog`, added Zod validation for name, email, platform fee, and status, added inline field errors and BAYD toast feedback, replaced partner deletion with the shared `AlertDialog`, and added confirmation/toast handling for payout creation and marking payouts paid.
- **Verification:** Targeted ESLint passed for the partners page. `git diff --check` passed.
- **Follow-up:** Backend zero-booking settlement hardening was intentionally left out of this frontend-only change.

---

## 2026-08-19 — Job posting editor and application actions lacked validation feedback

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and careers workflow
- **Reported behavior:** Job posting create/edit used an inline placeholder-based form with minimal validation. Deleting a posting used the browser confirmation dialog. Application status updates and document downloads could fail without branded feedback.
- **Expected behavior:** Job posting editing should use the shared dialog pattern, validate fields before submission, keep API errors visible, and use branded confirmations/toasts for destructive or failure-prone actions.
- **Root cause:** `client/app/dashboard/admin/jobs/page.tsx` submitted raw posting form values directly to mutations, rendered the editor inline, only disabled Save for a missing title, called `confirm(...)` for deletion, and did not catch application status or document download failures.
- **Fix:** Moved posting create/edit into the shared `Dialog`, added Zod validation for title, employment type, status, salary values, and salary range ordering, added inline field errors and BAYD toast feedback, replaced posting deletion with the shared `AlertDialog`, and added toast-backed failure handling for application status updates and secure document downloads.
- **Verification:** Targeted ESLint passed for the jobs page. `git diff --check` passed.
- **Follow-up:** Application deletion remains out of scope because the current page does not expose that workflow.

---

## 2026-08-19 — Booking status actions lacked confirmations and failure feedback

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and booking workflow
- **Reported behavior:** Starting, completing, cancelling, and reassigning bookings happened with little or no visible feedback. Completing a booking was immediate, cancelling did not capture a reason, and reassignment failures only showed a small inline message.
- **Expected behavior:** High-impact booking status changes should use branded confirmations where appropriate, cancellation should preserve an admin-entered reason, and status/reassignment API failures should be visible through the shared toast pattern.
- **Root cause:** `client/app/dashboard/admin/bookings/page.tsx` called the update mutation directly from action buttons without mutation-level `onError` handling. `client/components/dashboard/reassign-control.tsx` handled assignment failures only inline and did not report candidate-load or success states through toasts.
- **Fix:** Added BAYD toast feedback for booking status updates, added an `AlertDialog` confirmation for completing a booking, added a cancellation `Dialog` with a reason field passed to the existing API, and added toast-backed success/error handling to reassignment and candidate loading.
- **Verification:** Targeted ESLint passed for the bookings page and reassignment control. `git diff --check` passed.
- **Follow-up:** Calendar mode still uses the current paginated booking response; a full-calendar data source should be handled separately if admins need complete month coverage.

---

## 2026-08-19 — Booking request admin used stale fields and hid assignment diagnostics

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and booking request API shape
- **Reported behavior:** The Booking Requests page expected `request_type`, `preferred_at`, and `service_area` fields even though current booking requests use `kind`, `requested_start`, and `address`. Status filters omitted valid failure statuses, and admins could not inspect assignment attempts from the list.
- **Expected behavior:** The request list should display current request data, filter by all valid statuses, and expose assignment diagnostics for failed/no-coverage/no-availability requests.
- **Root cause:** `client/app/dashboard/admin/booking-requests/page.tsx` still reflected an older request shape. The admin booking request controller also included `service_area`, which is no longer an association on `BookingRequest`.
- **Fix:** Aligned the admin API include tree to `address` and assigned employee data, updated the page types/display fields, added all valid status filters, added a details dialog backed by `GET /admin/booking_requests/:id`, displayed assignment attempts/candidates, added toast feedback for query failures, and refreshed the admin tour copy.
- **Verification:** Targeted ESLint passed for the booking requests page and tour copy. Ruby syntax check passed for the admin booking requests controller. `git diff --check` passed.
- **Follow-up:** Assignment attempt candidates currently show employee IDs from the stored audit payload; enriching historical candidate rows with names would require backend-side lookup or a richer audit format.

---

## 2026-08-19 — Subscription admin actions lacked confirmations and validation

- **Branch:** `bugfix/admin-user-role-errors`
- **Area:** Admin frontend and subscription workflow
- **Reported behavior:** Cancelling a subscription happened immediately, deleting used the browser confirmation dialog, frequency edits accepted invalid values until backend rejection, and subscription mutations had no branded success or failure feedback.
- **Expected behavior:** Subscription cancellation/deletion should use branded confirmations, frequency edits should validate positive whole numbers before save, and update/cancel/delete mutations should surface success and API failures through the shared toast pattern.
- **Root cause:** `client/app/dashboard/admin/subscriptions/page.tsx` called admin subscription mutations directly from row controls, used `confirm(...)` for deletion, and only disabled frequency save with a loose numeric truthiness check.
- **Fix:** Added BAYD toast success/error feedback for status, frequency, cancellation, and deletion updates; replaced delete with the shared `AlertDialog`; added a cancellation confirmation dialog; added inline positive-integer validation for frequency count; disabled row controls during pending mutations; and made next-run date formatting defensive.
- **Verification:** Targeted ESLint passed for the subscriptions page. `git diff --check` passed.
- **Follow-up:** Bulk subscription operations remain out of scope.
