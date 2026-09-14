"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStartMeeting, type Meeting } from "@/lib/hooks/use-meetings"
import type { Booking } from "@/lib/hooks/use-bookings"

// The Jitsi embed touches the DOM/iframe; load it client-only.
const JitsiCall = dynamic(() => import("@/components/jitsi-call").then((m) => m.JitsiCall), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-white/60">Connecting…</div>
  ),
})

// Work-scope video call control shown on a booking. If a call already exists it
// opens the EMBEDDED room (Jitsi SDK, in a dialog - no browser hop); otherwise it
// creates one (which notifies both parties) then opens it. Only offered to
// special-needs and first-time clients, or whenever a call already exists.
export function MeetingButton({ booking }: { booking: Booking }) {
  const start = useStartMeeting()
  const [open, setOpen] = useState(false)
  const meeting: Meeting | null = booking.meeting

  const hasCall = meeting != null && meeting.status !== "cancelled"

  function startAndOpen() {
    start.mutate(booking.id, { onSuccess: () => setOpen(true) })
  }

  // A returning, non-special-needs client with no existing call sees nothing.
  if (!hasCall && !booking.meeting_recommended) return null

  // The room name to embed: the existing meeting's, or the one just created
  // (the mutation refreshes bookings, so booking.meeting populates on success).
  const roomName = meeting?.room_name ?? start.data?.room_name ?? null

  return (
    <>
      {hasCall ? (
        <Button
          size="xs"
          onClick={() => setOpen(true)}
          style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
        >
          <Video className="size-3.5 mr-1" /> Join call
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled={start.isPending} onClick={startAndOpen}>
          <Video className="size-3.5 mr-1" /> {start.isPending ? "Starting…" : "Start call"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[85dvh] max-w-3xl overflow-hidden bg-black p-0">
          <DialogHeader className="px-4 py-2">
            <DialogTitle className="text-white">Work-scope call</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(85dvh-3.25rem)] w-full">
            {roomName ? (
              <JitsiCall roomName={roomName} onEnd={() => setOpen(false)} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/60">
                Setting up the call…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
