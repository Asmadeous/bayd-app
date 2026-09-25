"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ChevronLeft } from "lucide-react"

import { useBooking } from "@/lib/hooks/use-bookings"
import { BubbleLoader } from "@/components/bubble-loader"

// The Jitsi embed touches the DOM/iframe; load it client-only.
const JitsiCall = dynamic(() => import("@/components/jitsi-call").then((m) => m.JitsiCall), {
  ssr: false,
  loading: () => <CallLoading />,
})

export default function CallScreen() {
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

  const { data: booking, isLoading } = useBooking(bookingId)
  const meeting = booking?.meeting

  function leave() {
    router.replace("/app/bookings")
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
        <p className="text-sm font-semibold text-white/90">Work-scope call</p>
      </header>

      <div className="relative flex-1">
        {isLoading ? (
          <CallLoading />
        ) : meeting && meeting.status === "scheduled" ? (
          <JitsiCall roomName={meeting.room_name} onEnd={leave} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-white/70">
            This call isn&apos;t available. It may have ended or not been set up yet.
          </div>
        )}
      </div>
    </div>
  )
}

function CallLoading() {
  return (
    <div className="grid h-full w-full place-items-center bg-black">
      <BubbleLoader tone="light" label="Connecting to your call" />
    </div>
  )
}
