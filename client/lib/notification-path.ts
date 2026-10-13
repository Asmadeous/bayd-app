import type { AppNotification } from "@/lib/hooks/use-notifications"

// Website links the backend stores in action_url, and the app screen each opens.
const CUSTOMER_PAGES: Record<string, string> = {
  "/book": "/app/book",
  "/dashboard/customer/book": "/app/book",
  "/dashboard/customer/bookings": "/app/home",
  "/dashboard/customer/loyalty": "/app/loyalty",
  "/dashboard/customer/settings": "/app/account",
}

const BOOKING_SCREEN = {
  customer: "/app/bookings/view",
  staff: "/staff/schedule/job",
  admin: "/admin/bookings/view",
}

// The in-app screen a notification opens when tapped, or null when there's
// nothing more to see. A booking notification opens that booking.
export function notificationPath(n: AppNotification, app: "customer" | "staff" | "admin"): string | null {
  if (n.booking_id) return `${BOOKING_SCREEN[app]}?id=${n.booking_id}`
  if (!n.action_url) return null

  const url = new URL(n.action_url, "https://app.invalid")
  if (app === "staff") return url.pathname.startsWith("/staff") ? `${url.pathname}${url.search}` : null
  // Admin alerts link to the web dashboard; each app screen is the same path
  // without "/dashboard" (Overview is Home).
  if (app === "admin") {
    if (url.pathname === "/dashboard/admin") return "/admin/home"
    return url.pathname.startsWith("/dashboard/admin/") ? `${url.pathname.replace("/dashboard", "")}${url.search}` : null
  }
  if (url.pathname.startsWith("/app/")) return `${url.pathname}${url.search}`
  return CUSTOMER_PAGES[url.pathname] ?? null
}
