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

// A calendar day as "YYYY-MM-DD". Day keys are plain dates with no timezone of
// their own; all arithmetic on them runs in UTC so DST never shifts a day.
export type DateKey = string

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: BOOKING_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

// The company-zone day a booking starts on. The ONLY way to put a booking on a
// calendar day (a UTC slice puts evening bookings on the next day).
export function bookingDateKey(iso: string): DateKey {
  return keyFormat.format(new Date(iso))
}

// Minutes after company-zone midnight. The ONLY way to place a booking on an
// hour grid (the device's zone would shift it for anyone outside Toronto).
export function bookingLocalMinutes(iso: string): number {
  const [h, m] = clockFormat.format(new Date(iso)).split(":").map(Number)
  return h * 60 + m
}

export function todayKey(): DateKey {
  return keyFormat.format(new Date())
}

export function nowLocalMinutes(): number {
  return bookingLocalMinutes(new Date().toISOString())
}

function keyToUtc(key: DateKey) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = keyToUtc(key)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// 0 = Sunday.
export function weekdayOf(key: DateKey): number {
  return keyToUtc(key).getUTCDay()
}

export function formatDateKey(key: DateKey, opts: Intl.DateTimeFormatOptions): string {
  return keyToUtc(key).toLocaleDateString("en-CA", { ...opts, timeZone: "UTC" })
}
