// Booking appointment times are wall-clock in the COMPANY timezone (Toronto),
// stored UTC by the API. The app must always display them in that zone - NOT the
// device's timezone - or a customer in another timezone sees the wrong hour
// (e.g. 9 AM Toronto shown as 4 PM on a UTC+3 phone). Mirrors the backend's
// BusinessHours.zone (BOOKING_TIMEZONE, default America/Toronto).
const BOOKING_TZ =
  process.env.NEXT_PUBLIC_BOOKING_TIMEZONE ?? "America/Toronto"

// Format a booking's ISO start (UTC) as company-zone date/time.
export function formatBookingDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  return new Date(iso).toLocaleDateString(undefined, { ...opts, timeZone: BOOKING_TZ })
}

export function formatBookingTime(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  return new Date(iso).toLocaleTimeString(undefined, { ...opts, timeZone: BOOKING_TZ })
}

// Combined "Fri, Sep 4 · 9:00 AM" style, always in company zone.
export function formatBookingDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: BOOKING_TZ,
  })
}
