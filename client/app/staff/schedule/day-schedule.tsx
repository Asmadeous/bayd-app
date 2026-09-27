"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

import { formatTime } from "@/components/booking/time-groups"
import { DayTimeline } from "@/components/calendar/day-timeline"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { bookingDateKey, formatBookingTime, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useEmployeeScheduleRange, useStaffReschedule } from "@/lib/hooks/use-employee"
import { apiError } from "./job-edit-sheets"
import { mutedClass } from "../staff-theme"

// One day of the tech's jobs as an hour grid, each job drawn from its start to
// its end. Tap a job to open it, tap an open time (today onward) to book it,
// press and hold a job to drag it. Shown under the Schedule calendar and on the
// day screen.
export function DaySchedule({ day }: { day: string }) {
  const router = useRouter()
  const { data = [], isLoading } = useEmployeeScheduleRange(day, day)
  const jobs = data.filter((b) => bookingDateKey(b.starts_at) === day)
  const editable = day >= todayKey()
  const confirm = useConfirm()
  const { toast } = useToast()
  const reschedule = useStaffReschedule()

  // Dropping a dragged job asks first (the client is told), then moves it. A
  // refusal comes back in plain words and the block snaps back.
  async function moveJob(booking: Booking, time: string) {
    const client = booking.customer_name ?? "The client"
    const ok = await confirm({
      title: "Move this job?",
      message: `${booking.service.name} for ${client}, from ${formatBookingTime(booking.starts_at)} to ${formatTime(time)}. ${client} is told the new time.`,
      confirmLabel: `Move to ${formatTime(time)}`,
      cancelLabel: "Keep it",
    })
    if (!ok) return
    try {
      await reschedule.mutateAsync({ bookingId: booking.id, startsAt: `${day}T${time}:00` })
      toast({ title: "Job moved", description: `Now ${formatTime(time)}. ${client} has been told.`, variant: "success" })
    } catch (e: unknown) {
      toast({ title: "Couldn't move the job", description: apiError(e), variant: "error" })
    }
  }

  return (
    <div className="space-y-3">
      {editable ? <DayHint /> : null}
      {isLoading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-black/5" />
      ) : (
        <DayTimeline
          day={day}
          bookings={jobs}
          who={(b) => b.customer_name}
          onOpen={(b) => router.push(`/staff/schedule/job?id=${b.id}`)}
          onSlot={editable ? (time) => router.push(`/staff/schedule/new?date=${day}&time=${time}`) : undefined}
          onMove={editable ? moveJob : undefined}
        />
      )}
      {!isLoading && jobs.length === 0 ? <p className={`text-center text-sm ${mutedClass}`}>No jobs this day.</p> : null}
    </div>
  )
}

const HINT_KEY = "bayd.staff.dayHintSeen"

// First-use guidance for the day view, shown until the tech dismisses it once on
// this device. Storage can be unavailable (private mode), so it fails open.
function DayHint() {
  const [seen, setSeen] = useState(() => {
    try {
      return window.localStorage.getItem(HINT_KEY) === "1"
    } catch {
      return false
    }
  })
  if (seen) return null

  function dismiss() {
    setSeen(true)
    try {
      window.localStorage.setItem(HINT_KEY, "1")
    } catch {
      // Not remembered; it shows again next time.
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#14100F] p-4 text-white">
      <ul className="flex-1 space-y-1 text-sm">
        <li><span className="font-bold">Tap an open time</span> to book a client into it.</li>
        <li><span className="font-bold">Press and hold a job</span>, then drag it to a new time.</li>
        <li><span className="font-bold">Tap a job</span> to reschedule, cancel or run it.</li>
      </ul>
      <button type="button" onClick={dismiss} aria-label="Got it, hide this tip" className="rounded-full p-1 text-white/70">
        <X className="size-4" />
      </button>
    </div>
  )
}
