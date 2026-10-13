# Feature: Admin app - Content and Settings

**From build-plan:** feature 11f (Phase 11, plan in `docs/ADMIN_MOBILE_APP_PLAN.md`)
**Status:** complete

## Goal

Blog posts and comments, Gallery, Reviews, Newsletter, Service areas,
Settings (Payments in the menu) and Royalties in the admin app.

## In scope (web page -> app screen)

| Web | App | What it does |
|---|---|---|
| `/dashboard/admin/blog` (+ new, edit) | `/admin/blog`, `/admin/blog/new`, `/admin/blog/edit?id=` | publish, unpublish, delete, the same post form |
| `/dashboard/admin/blog-comments` | `/admin/blog-comments` | approve, delete; the post opens on the website |
| `/dashboard/admin/gallery` | `/admin/gallery` | category filter, add (photo or URL), edit, delete |
| `/dashboard/admin/reviews` | `/admin/reviews` | approve, feature, delete |
| `/dashboard/admin/newsletter` | `/admin/newsletter` | the web composer, subscribers, remove |
| `/dashboard/admin/service-areas` | `/admin/service-areas` | coverage by FSA |
| `/dashboard/admin/settings` | `/admin/settings` | profile, group deposit, invoice details, password |
| `/dashboard/admin/royalties` | `/admin/royalties` | own statements; super admins build and settle |

## Build steps

- [x] **Step 1 - Shared pieces** - the blog form moved from
  `app/dashboard/admin/blog/_components` to
  `components/dashboard/blog-post-form.tsx` (new `listHref`); the gallery
  editor to `components/dashboard/gallery-editor.tsx`.
- [x] **Step 2 - App screens**
- [x] **Step 3 - Phone check**

## As built

- Every screen compared with its web page on your phone.
- Web fix: the gallery editor kept "Add to gallery" disabled until an image
  URL was typed, even with a photo picked, though saving accepts a photo
  alone. It now enables with either.
- Image previews in the shared gallery and blog editors go through
  `assetUrl`, so they show in the app too.

## Notes for the AI

- Parity rule: every web action exists in the app; nothing view-only.
