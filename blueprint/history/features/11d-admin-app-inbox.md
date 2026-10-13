# Feature: Admin app - Inbox

**From build-plan:** feature 11d (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

The admin app's inbox does everything the web dashboard's does: Messages,
Support chat, Chat reports, Notifications, Inquiries and Callbacks, laid out
for a phone.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin/messages` | `/admin/messages`, `/admin/messages/thread?id=` | conversations and the live thread (no Report/Block, as on the web) |
| `/dashboard/admin/support` | `/admin/support`, `/admin/support/thread?id=` | open or closed chats, reply, close and reopen |
| `/dashboard/admin/chat-reports` | `/admin/chat-reports`, `/admin/chat-reports/view?id=` | filters, the report with the whole conversation, mark reviewed, reopen |
| `/dashboard/admin/notifications` | `/admin/notifications` | list, mark all read, tap opens what it's about |
| `/dashboard/admin/inquiries` | `/admin/inquiries` | contact, franchise and job inquiries, status, reply by email |
| `/dashboard/admin/callbacks` | `/admin/callbacks` | status and call |

## Out of scope

- Other menu sections.

## Build steps

- [x] **Step 1 - Messages and Support chat** - shared full-screen chat layout
  (`app/admin/thread-screen.tsx`).
- [x] **Step 2 - Chat reports, Notifications, Inquiries, Callbacks**
- [x] **Step 3 - Phone check** - build, install, compare each screen with the
  web.

## As built

- Every screen compared with its web page on your phone.
- Links the backend puts in admin alerts open the app's own screens:
  `notificationPath` gained an `admin` mode (`/dashboard/admin/...` maps to
  `/admin/...`, bookings open the admin booking screen), and the web's
  `?thread=`, `?id=` and `?c=` deep links open the matching app thread or
  report.
- Chat pushes for admins name the staff thread; in BAYD Admin they now open
  the admin thread (`inThisApp` in `lib/native/use-push-registration.ts`), and
  the foreground check compares against the mapped path.
- Web fix: Inquiries listed a raw "Franchise ID" field after Phase 10; it is
  hidden on the web and in the app.

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
- The admin tree must not import from other `app/` trees.
