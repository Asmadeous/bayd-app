"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Video } from "lucide-react"

import { CallTimeForm } from "@/components/call-time-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useRescheduleMeeting, useStartMeeting, type CallTime } from "@/lib/hooks/use-meetings"
import { callState, callTimeLabel, meetingError } from "@/lib/meeting-time"

// The Jitsi embed touches the DOM/iframe; load it client-only.
const JitsiCall = dynamic(() => import("@/components/jitsi-call").then((m) => m.JitsiCall), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-white/60">Connecting…</div>
  ),
})

// Work-scope video call on a booking (customer and staff web dashboards). The
// call is set for a time first (or "now"), so both people are told when to be
// there; Join opens 10 minutes before. Offered to special-needs and first-time
// clients, or whenever a call already exists.
export function MeetingButton({ booking }: { booking: Booking }) {
  const start = useStartMeeting()
  const move = useRescheduleMeeting()
  const [picking, setPicking] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meeting = booking.meeting
  const now = useNow()
  const state = callState(meeting, now)

  if (state === "none" && !booking.meeting_recommended) return null

  function save(at: CallTime) {
    setError(null)
    const done = {
      onSuccess: () => {
        setPicking(false)
        if (at === "now") setInCall(true)
      },
      onError: (e: unknown) => setError(meetingError(e)),
    }
    if (meeting && meeting.status === "scheduled") move.mutate({ meetingId: meeting.id, at }, done)
    else start.mutate({ bookingId: booking.id, at }, done)
  }

  const roomName = meeting?.room_name ?? start.data?.room_name ?? null

  return (
    <>
      {state === "none" ? (
        <Button size="xs" variant="outline" onClick={() => setPicking(true)}>
          <Video className="mr-1 size-3.5" /> Schedule call
        </Button>
      ) : state === "waiting" ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 bg-black/[0.04] px-2.5 text-xs font-semibold text-[#5f6268]">
            <Video className="size-3.5" /> Call {callTimeLabel(meeting)}
          </span>
          <button type="button" onClick={() => setPicking(true)} className="text-xs font-semibold text-[#c96c83] hover:underline">
            Change time
          </button>
        </span>
      ) : (
        <Button
          size="xs"
          onClick={() => setInCall(true)}
          style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
        >
          <Video className="mr-1 size-3.5" /> Join call
        </Button>
      )}

      <Dialog open={picking} onOpenChange={(open) => { setPicking(open); if (!open) setError(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Work-scope call</p>
            <DialogTitle>{state === "none" ? "When should the call be?" : "Move the call"}</DialogTitle>
            <DialogDescription>
              A short video call to go over the appointment before the visit, any time before it starts.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <CallTimeForm
              startsAt={booking.starts_at}
              pending={start.isPending || move.isPending}
              error={error}
              submitLabel={state === "none" ? "Set call time" : "Move call"}
              onSubmit={save}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={inCall} onOpenChange={setInCall}>
        <DialogContent className="h-[85dvh] max-w-3xl overflow-hidden bg-black p-0">
          <DialogHeader className="px-4 py-2">
            <DialogTitle className="text-white">Work-scope call</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(85dvh-3.25rem)] w-full">
            {roomName ? (
              <JitsiCall roomName={roomName} onEnd={() => setInCall(false)} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/60">Setting up the call…</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Re-render every 30s so "Call 3:30 PM" turns into "Join call" on its own.
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}
