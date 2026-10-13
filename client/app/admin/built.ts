// App screens built so far (Phase 11). Menu entries and shortcuts for the rest
// show greyed, so the app always lists what the web dashboard has.
export const BUILT = new Set([
  "/admin/home",
  "/admin/bookings",
  "/admin/calendar",
  "/admin/analytics",
  "/admin/booking-requests",
  "/admin/subscriptions",
  "/admin/meetings",
  "/admin/users",
  "/admin/employees",
  "/admin/partners",
  "/admin/jobs",
  "/admin/shifts",
  "/admin/staff-locations",
  "/admin/messages",
  "/admin/support",
  "/admin/chat-reports",
  "/admin/notifications",
  "/admin/inquiries",
  "/admin/callbacks",
  "/admin/services",
  "/admin/products",
  "/admin/orders",
  "/admin/invoices",
  "/admin/gift-cards",
  "/admin/loyalty",
  "/admin/tips",
  "/admin/blog",
  "/admin/blog-comments",
  "/admin/gallery",
  "/admin/reviews",
  "/admin/newsletter",
  "/admin/service-areas",
  "/admin/settings",
  "/admin/royalties",
  "/admin/franchises",
  "/admin/branches",
])

// Each app screen lives at the web path without "/dashboard"; Overview is Home.
export function appHref(webHref: string) {
  return webHref === "/dashboard/admin" ? "/admin/home" : webHref.replace("/dashboard/admin", "/admin")
}
