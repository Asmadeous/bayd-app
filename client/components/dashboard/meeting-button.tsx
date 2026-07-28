"use client"

import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStartMeeting, type Meeting } from "@/lib/hooks/use-meetings"
import type { Booking } from "@/lib/hooks/use-bookings"

// Work-scope video call control shown on a booking. If a call already exists it
// opens the room; otherwise it creates one (which notifies both parties) then
// opens it. Only meaningful for live bookings.
export function MeetingButton({ booking }: { booking: Booking }) {
  const start = useStartMeeting()
  const meeting: Meeting | null = booking.meeting

  // An existing call is always joinable. Otherwise the call is only offered to
  // special-needs and first-time clients; existing clients don't need one, and
  // the booking never depends on the call happening.
  if (meeting && meeting.status !== "cancelled") {
    return (
      <a href={meeting.url} target="_blank" rel="noopener noreferrer">
        <Button size="xs" style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>
          <Video className="size-3.5 mr-1" /> Join call
        </Button>
      </a>
    )
  }

  if (!booking.meeting_recommended) return null

  return (
    <Button
      size="xs"
      variant="outline"
      disabled={start.isPending}
      onClick={() =>
        start.mutate(booking.id, {
          onSuccess: (m) => window.open(m.url, "_blank", "noopener,noreferrer"),
        })
      }
    >
      <Video className="size-3.5 mr-1" /> {start.isPending ? "Starting…" : "Start call"}
    </Button>
  )
}
