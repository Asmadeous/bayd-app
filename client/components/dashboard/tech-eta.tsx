"use client"

import { Navigation } from "lucide-react"

import { useTrip } from "@/lib/cable/use-trip"

// Day-of live ETA banner. Subscribes to the booking's TripChannel and shows the
// technician's ETA once they're en route. Renders nothing until a position
// arrives (i.e. only on the job day when the tech's app is sending GPS), so it
// stays out of the way for future bookings. `enabled` gates the subscription to
// bookings happening soon.
export function TechEta({ bookingId, enabled }: { bookingId: number; enabled: boolean }) {
  const position = useTrip(enabled ? bookingId : null)
  if (!position) return null

  const eta = position.eta_minutes
  const label =
    eta == null ? "Your technician is on the way" : eta <= 1 ? "Your technician is arriving now" : `Your technician is about ${eta} min away`

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#c96c83]/10 px-3 py-2 text-sm font-medium text-[#c96c83]">
      <Navigation className="size-4" aria-hidden />
      {label}
    </div>
  )
}
