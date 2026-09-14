"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ChevronLeft } from "lucide-react"

import { useEmployeeBooking } from "@/lib/hooks/use-employee"

// The Jitsi embed touches the DOM/iframe; load it client-only.
const JitsiCall = dynamic(() => import("@/components/jitsi-call").then((m) => m.JitsiCall), {
  ssr: false,
  loading: () => <CallLoading />,
})

export default function StaffCallScreen() {
  return (
    <Suspense fallback={<CallLoading />}>
      <CallView />
    </Suspense>
  )
}

function CallView() {
  const router = useRouter()
  const params = useSearchParams()
  const bookingId = Number(params.get("id")) || 0

  const { data: booking, isLoading } = useEmployeeBooking(bookingId)
  const meeting = booking?.meeting

  function leave() {
    router.replace("/staff/schedule")
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <header className="flex items-center gap-3 px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={leave}
          aria-label="Leave call"
          className="grid size-9 place-items-center rounded-full bg-white/15 text-white"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white/90">Work-scope call</p>
          {booking?.service?.name && (
            <p className="truncate text-xs text-white/50">{booking.service.name}</p>
          )}
        </div>
      </header>

      <div className="relative flex-1">
        {isLoading ? (
          <CallLoading />
        ) : meeting && meeting.status === "scheduled" ? (
          <JitsiCall roomName={meeting.room_name} onEnd={leave} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-white/70">
            This call isn&apos;t available. Tap Start call on the booking to open one.
          </div>
        )}
      </div>
    </div>
  )
}

function CallLoading() {
  return (
    <div className="grid h-full w-full place-items-center bg-black text-sm text-white/60">
      Connecting to the call…
    </div>
  )
}
