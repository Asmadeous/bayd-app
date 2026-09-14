"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ChevronLeft, MapPin, Navigation } from "lucide-react"

import { useBooking } from "@/lib/hooks/use-bookings"
import { useTrip } from "@/lib/cable/use-trip"
import { appScreenClass } from "../../app-theme"

// Leaflet touches window; load the map client-only.
const TripMap = dynamic(() => import("../trip-map").then((m) => m.TripMap), {
  ssr: false,
  loading: () => <div className="h-[45dvh] w-full animate-pulse rounded-2xl bg-black/5" />,
})

export default function TrackScreen() {
  return (
    <Suspense>
      <TrackView />
    </Suspense>
  )
}

function TrackView() {
  const router = useRouter()
  const params = useSearchParams()
  const bookingId = Number(params.get("id")) || null

  const { data: booking, isLoading } = useBooking(bookingId ?? 0)
  // Pure websocket - the tech's live position streams in over TripChannel. No
  // polling: we don't need history, only where they are now. null until the
  // tech's app sends its first GPS ping while en route.
  const position = useTrip(bookingId)

  const destLat = booking?.service_latitude ? Number(booking.service_latitude) : null
  const destLng = booking?.service_longitude ? Number(booking.service_longitude) : null
  const trackable = booking && ["confirmed", "in_progress"].includes(booking.status)

  return (
    <div className={appScreenClass}>
      <header className="flex items-center gap-3 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-extrabold">Track your tech</h1>
      </header>

      <div className="space-y-4 px-5">
        {isLoading ? (
          <div className="h-[45dvh] w-full animate-pulse rounded-2xl bg-black/5" />
        ) : !booking ? (
          <Empty message="We couldn't find that booking." />
        ) : !trackable ? (
          <Empty message="Tracking opens once your appointment is confirmed and on the way." />
        ) : destLat == null || destLng == null ? (
          <Empty message="This booking has no mapped address to track toward." />
        ) : (
          <>
            <TripMap techLat={position?.latitude ?? null} techLng={position?.longitude ?? null} destLat={destLat} destLng={destLng} />

            <div className="rounded-2xl bg-[#101217] p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#c96c83]">
                  <Navigation className="size-5" aria-hidden />
                </span>
                <div>
                  {position ? (
                    position.eta_minutes != null ? (
                      <>
                        <p className="text-lg font-extrabold leading-tight">
                          {position.eta_minutes} min away
                        </p>
                        <p className="text-sm text-white/55">Your technician is on the way.</p>
                      </>
                    ) : (
                      <p className="font-bold">Your technician is on the way.</p>
                    )
                  ) : (
                    <>
                      <p className="font-bold leading-tight">Waiting for a live location…</p>
                      <p className="text-sm text-white/55">Tracking starts when your tech sets off.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="flex items-start gap-2 text-sm text-[#101217]/70">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#c96c83]" aria-hidden />
                <span>{booking.service.name} · arriving at your address</span>
              </p>
            </div>
          </>
        )}

        <Link href="/app/bookings" className="block pt-1 text-center text-sm font-semibold text-[#101217]/45">
          Back to bookings
        </Link>
      </div>
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#101217]/60 shadow-sm">{message}</div>
  )
}
