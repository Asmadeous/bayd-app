import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import type { Meeting } from "@/lib/hooks/use-meetings"

export type CallState = "none" | "waiting" | "open"

// Where a booking's work-scope call is: not set up, set for later (room not
// open yet), or open to join (from 10 minutes before its time).
export function callState(meeting: Meeting | null | undefined, now = Date.now()): CallState {
  if (!meeting || meeting.status !== "scheduled") return "none"
  const opens = meeting.join_opens_at ?? meeting.scheduled_at
  if (!opens) return "open"
  return now >= new Date(opens).getTime() ? "open" : "waiting"
}

// "Thu, Oct 8, 3:30 PM" in the business's timezone.
export function callTimeLabel(meeting: Meeting | null | undefined) {
  if (!meeting?.scheduled_at) return ""
  return `${formatBookingDate(meeting.scheduled_at, { weekday: "short", month: "short", day: "numeric" })}, ${formatBookingTime(
    meeting.scheduled_at,
    { hour: "numeric", minute: "2-digit" },
  )}`
}

export function meetingError(e: unknown) {
  const data = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? "Couldn't set up the call. Please try again."
}
