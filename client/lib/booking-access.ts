"use client"

import { useEffect, useState } from "react"

import { bookingDateKey, formatBookingDate, formatBookingTime, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"

// Mirrors Booking::ACCESS_STATUSES. Messaging, live tracking, clock-in and
// navigation open at booking.access_opens_at (set by the API, 30 minutes before
// the start) and close once the booking leaves these statuses. The API enforces
// the window; this only decides what the apps show.
const ACCESS_STATUSES: Booking["status"][] = ["pending", "confirmed", "in_progress"]
const ACCESS_LEAD_MS = 30 * 60 * 1000

// Re-renders the moment the window opens, so a locked button unlocks without a
// refresh. Uses the device clock for display only.
export function useBookingAccess(booking: Pick<Booking, "status" | "access_opens_at" | "starts_at">) {
  // Falls back to start - 30 min for a server that doesn't send access_opens_at yet.
  const opensIso =
    booking.access_opens_at ??
    (booking.starts_at ? new Date(new Date(booking.starts_at).getTime() - ACCESS_LEAD_MS).toISOString() : null)
  const opensAt = opensIso ? new Date(opensIso).getTime() : null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (opensAt === null || now >= opensAt) return
    const id = setTimeout(() => setNow(Date.now()), Math.min(opensAt - now + 500, 2_147_000_000))
    return () => clearTimeout(id)
  }, [opensAt, now])

  const active = ACCESS_STATUSES.includes(booking.status)
  const open = active && opensAt !== null && now >= opensAt
  return { active, open, opensLabel: opensIso ? opensLabel(opensIso) : "" }
}

// "9:15 AM" today, otherwise "Fri, Sep 26, 9:15 AM" (company zone).
function opensLabel(iso: string) {
  const time = formatBookingTime(iso)
  return bookingDateKey(iso) === todayKey() ? time : `${formatBookingDate(iso)}, ${time}`
}

// The message shown when someone taps a locked action; mirrors the API's wording.
export function windowNotStartedMessage(opensLabel: string, action: string) {
  return `Your appointment window hasn't started yet. You can ${action} from ${opensLabel} (30 minutes before the appointment).`
}
