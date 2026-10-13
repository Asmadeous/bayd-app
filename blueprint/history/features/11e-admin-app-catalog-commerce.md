# Feature: Admin app - Catalog and Commerce

**From build-plan:** feature 11e (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

Services, Products, Orders, Invoices, Gift cards, Loyalty and Tips in the
admin app, with every action the web pages have.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin/services` | `/admin/services` | catalog, tiers, add, edit, delete |
| `/dashboard/admin/products` | `/admin/products` | products, stock, add, edit, delete |
| `/dashboard/admin/orders` | `/admin/orders` | status filter, items, fulfillment status |
| `/dashboard/admin/invoices` | `/admin/invoices` | status and type filters, status, view, PDF, re-email, delete, manual invoice |
| `/dashboard/admin/gift-cards` | `/admin/gift-cards` | issue, send, enable or disable, delete, top-up |
| `/dashboard/admin/loyalty` | `/admin/loyalty` | totals and balances |
| `/dashboard/admin/tips` | `/admin/tips` | tips owed, mark paid out |

## Build steps

- [x] **Step 1 - Shared editors** - `ServiceEditorDialog`,
  `ProductEditorDialog`, `ManualInvoiceDialog`, `AdminGiftCard` and
  `IssueGiftCardDialog` moved out of the web pages into
  `components/dashboard/`; the web pages use them unchanged (each editor
  opened on the web after the move).
- [x] **Step 2 - App screens**
- [x] **Step 3 - Phone check**

## As built

- Every screen compared with its web page on your phone.
- Open, on hold by the user: the invoice PDF button (and the job document
  download in 11c) uses a blob download that the Android WebView ignores, so
  it most likely does nothing in the app. Fix options for the user: two
  Capacitor plugins (save, then share sheet) or a backend short-lived
  download link. Not yet confirmed on the phone.

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
