"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { formatTime } from "@/components/booking/time-groups"
import { DayTimeline } from "@/components/calendar/day-timeline"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { addDays, bookingDateKey, formatBookingTime, formatDateKey, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useEmployeeScheduleRange, useStaffReschedule } from "@/lib/hooks/use-employee"
import { apiError } from "../job-edit-sheets"
import { StaffHeader } from "../../staff-header"
import { mutedClass, staffScreenClass } from "../../staff-theme"

// One day of the tech's jobs, Google-Calendar style: an hour grid with each job
// drawn from its start to its end. Arrows step a day at a time; tap a job to
// open it, or tap an open time (today onward) to book it. Opened by tapping a
// date in the Schedule calendar.
// useSearchParams needs a Suspense boundary for the static export.
export default function StaffDayScreen() {
  return (
    <Suspense>
      <StaffDay />
    </Suspense>
  )
}

function StaffDay() {
  const router = useRouter()
  const day = useSearchParams().get("date") ?? todayKey()
  const { data = [], isLoading } = useEmployeeScheduleRange(day, day)
  const jobs = data.filter((b) => bookingDateKey(b.starts_at) === day)
  const go = (d: string) => router.replace(`/staff/schedule/day?date=${d}`)
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
    <div className={staffScreenClass}>
      <StaffHeader
        back
        title={formatDateKey(day, { weekday: "long", month: "short", day: "numeric" })}
        subtitle={isLoading ? " " : `${jobs.length} job${jobs.length === 1 ? "" : "s"}${day === todayKey() ? " · today" : ""}`}
      />
      <div className="space-y-3 px-5 pb-6">
        {editable ? <DayHint /> : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(addDays(day, -1))}
            aria-label="Previous day"
            className="grid size-10 place-items-center rounded-full bg-black/[0.05]"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(addDays(day, 1))}
            aria-label="Next day"
            className="grid size-10 place-items-center rounded-full bg-black/[0.05]"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {day !== todayKey() ? (
            <button type="button" onClick={() => go(todayKey())} className="rounded-full bg-black/[0.05] px-4 py-2 text-sm font-bold">
              Today
            </button>
          ) : null}
          {editable ? (
            <Link href={`/staff/schedule/new?date=${day}`} className="ml-auto rounded-full bg-[#14100F] px-4 py-2 text-sm font-bold text-white">
              Add booking
            </Link>
          ) : null}
        </div>

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
