"use client"

import dynamic from "next/dynamic"
import { Navigation } from "lucide-react"

import { useTrip } from "@/lib/cable/use-trip"

// Leaflet touches window; load the map client-only.
const TripMap = dynamic(() => import("@/components/dashboard/trip-map").then((m) => m.TripMap), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-black/5" />,
})

// Day-of live tracking: subscribes to the booking's TripChannel and shows a map
// (tech's live pin + your address) plus the ETA once the technician is en route.
// Renders nothing until a position arrives, so it stays hidden for future
// bookings. `enabled` gates the subscription to bookings happening soon.
export function TechEta({
  bookingId,
  enabled,
  destination,
}: {
  bookingId: number
  enabled: boolean
  destination: { lat: number; lng: number } | null
}) {
  const position = useTrip(enabled ? bookingId : null)
  if (!position) return null

  const eta = position.eta_minutes
  const label =
    eta == null
      ? "Your technician is on the way"
      : eta <= 1
        ? "Your technician is arriving now"
        : `Your technician is about ${eta} min away`

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[#c96c83]/30 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#c96c83]">
        <Navigation className="size-4" aria-hidden />
        {label}
      </div>
      {destination && (
        <div className="px-2 pb-2">
          <TripMap tech={{ lat: position.latitude, lng: position.longitude }} destination={destination} />
        </div>
      )}
    </div>
  )
}
