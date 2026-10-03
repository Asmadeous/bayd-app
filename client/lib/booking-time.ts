import { franchiseConfig } from "@/lib/stores/franchise-store"

// Booking appointment times are wall-clock in the FRANCHISE's timezone, stored
// UTC by the API. The app must always display them in that zone - NOT the
// device's timezone - or a customer in another timezone sees the wrong hour
// (e.g. 9 AM Toronto shown as 4 PM on a UTC+3 phone). Mirrors the backend's
// BusinessHours.zone (the current franchise's time zone).
export function bookingTimeZone(): string {
  return franchiseConfig().time_zone
}

// "Toronto", "London": how the booking screens name the zone times are in.
export function bookingZoneLabel(): string {
  const city = bookingTimeZone().split("/").pop() ?? ""
  return city.replace(/_/g, " ")
}

// Format a booking's ISO start (UTC) as company-zone date/time.
export function formatBookingDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  return new Date(iso).toLocaleDateString(undefined, { ...opts, timeZone: bookingTimeZone() })
}

export function formatBookingTime(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  return new Date(iso).toLocaleTimeString(undefined, { ...opts, timeZone: bookingTimeZone() })
}

// Combined "Fri, Sep 4 · 9:00 AM" style, always in company zone.
export function formatBookingDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: bookingTimeZone(),
  })
}

// A calendar day as "YYYY-MM-DD". Day keys are plain dates with no timezone of
// their own; all arithmetic on them runs in UTC so DST never shifts a day.
export type DateKey = string

// Formatters are built once per zone (the franchise's zone can change when a
// customer picks another country).
const formatters = new Map<string, { key: Intl.DateTimeFormat; clock: Intl.DateTimeFormat }>()

function zoneFormatters() {
  const zone = bookingTimeZone()
  let f = formatters.get(zone)
  if (!f) {
    f = {
      key: new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }),
      clock: new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    }
    formatters.set(zone, f)
  }
  return f
}

// The company-zone day a booking starts on. The ONLY way to put a booking on a
// calendar day (a UTC slice puts evening bookings on the next day).
export function bookingDateKey(iso: string): DateKey {
  return zoneFormatters().key.format(new Date(iso))
}

// Minutes after company-zone midnight. The ONLY way to place a booking on an
// hour grid (the device's zone would shift it for anyone outside Toronto).
export function bookingLocalMinutes(iso: string): number {
  const [h, m] = zoneFormatters().clock.format(new Date(iso)).split(":").map(Number)
  return h * 60 + m
}

export function todayKey(): DateKey {
  return zoneFormatters().key.format(new Date())
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
