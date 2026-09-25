"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ChevronLeft, MapPin, Navigation } from "lucide-react"

import { useEmployeeBooking } from "@/lib/hooks/use-employee"
import { useBookingAccess } from "@/lib/booking-access"
import { useLivePosition } from "@/lib/native/use-live-position"
import { openPaymentUrl } from "@/lib/native/open-external"

const StaffNavMap = dynamic(() => import("../staff-nav-map").then((m) => m.StaffNavMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-black/5" />,
})

export default function NavigateScreen() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-[#F4F2EF]" />}>
      <NavigateView />
    </Suspense>
  )
}

// Straight-line distance so we always have a number to show even before the road
// route resolves (haversine, km).
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(s))
}

function NavigateView() {
  const router = useRouter()
  const params = useSearchParams()
  const bookingId = Number(params.get("id")) || 0

  const { data: booking, isLoading } = useEmployeeBooking(bookingId)
  const { position, error } = useLivePosition(true)

  const destLat = booking?.service_latitude ? Number(booking.service_latitude) : null
  const destLng = booking?.service_longitude ? Number(booking.service_longitude) : null
  // In-app navigation opens 30 minutes before the appointment.
  const access = useBookingAccess(booking ?? { status: "cancelled", access_opens_at: null, starts_at: "" })
  const locked = !!booking && access.active && !access.open
  const hasDest = destLat != null && destLng != null && !locked

  const addr = booking?.address
  const addressLine = addr
    ? [addr.line1, addr.line2, addr.city].filter(Boolean).join(", ")
    : null

  const km =
    position && hasDest ? haversineKm(position.latitude, position.longitude, destLat!, destLng!) : null

  function openExternal() {
    if (!hasDest) return
    openPaymentUrl(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`)
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#F4F2EF]">
      <header className="flex items-center gap-3 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.replace("/staff/schedule")}
          aria-label="Back"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold leading-tight">
            {booking?.customer_name ? `To ${booking.customer_name}` : "Navigate"}
          </p>
          {addressLine && <p className="truncate text-xs text-[#14100F]/55">{addressLine}</p>}
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-black/5" />
        ) : locked ? (
          <div className="grid h-full place-items-center px-8 text-center text-sm text-[#14100F]/60">
            Navigation opens at {access.opensLabel}, 30 minutes before the appointment.
          </div>
        ) : !hasDest ? (
          <div className="grid h-full place-items-center px-8 text-center text-sm text-[#14100F]/60">
            This booking has no mapped address, so it can&apos;t be navigated to.
          </div>
        ) : (
          <StaffNavMap
            meLat={position?.latitude ?? null}
            meLng={position?.longitude ?? null}
            destLat={destLat!}
            destLng={destLng!}
          />
        )}
      </div>

      {/* Route summary + external fallback */}
      {hasDest && (
        <div className="space-y-3 border-t border-black/10 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#C96C83] text-white">
              <Navigation className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {error ? (
                <p className="text-sm font-semibold text-[#8f3f4b]">{error}</p>
              ) : km != null ? (
                <p className="text-lg font-extrabold leading-tight">{km.toFixed(1)} km away</p>
              ) : (
                <p className="text-sm font-semibold text-[#14100F]/55">Finding your location…</p>
              )}
              {addressLine && (
                <p className="flex items-center gap-1 truncate text-xs text-[#14100F]/55">
                  <MapPin className="size-3.5 shrink-0" aria-hidden /> {addressLine}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openExternal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white py-3 text-sm font-bold text-[#14100F]"
          >
            <Navigation className="size-4" aria-hidden />
            Open turn-by-turn in Maps
          </button>
        </div>
      )}
    </div>
  )
}
