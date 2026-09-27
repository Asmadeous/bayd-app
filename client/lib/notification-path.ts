import type { AppNotification } from "@/lib/hooks/use-notifications"

// Website links the backend stores in action_url, and the app screen each opens.
const CUSTOMER_PAGES: Record<string, string> = {
  "/book": "/app/book",
  "/dashboard/customer/book": "/app/book",
  "/dashboard/customer/bookings": "/app/home",
  "/dashboard/customer/loyalty": "/app/loyalty",
  "/dashboard/customer/settings": "/app/account",
}

// The in-app screen a notification opens when tapped, or null when there's
// nothing more to see. A booking notification opens that booking.
export function notificationPath(n: AppNotification, app: "customer" | "staff"): string | null {
  if (n.booking_id) {
    return app === "staff" ? `/staff/schedule/job?id=${n.booking_id}` : `/app/bookings/view?id=${n.booking_id}`
  }
  if (!n.action_url) return null

  const url = new URL(n.action_url, "https://app.invalid")
  if (app === "staff") return url.pathname.startsWith("/staff") ? `${url.pathname}${url.search}` : null
  if (url.pathname.startsWith("/app/")) return `${url.pathname}${url.search}`
  return CUSTOMER_PAGES[url.pathname] ?? null
}
