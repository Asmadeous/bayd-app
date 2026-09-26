"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { DayTimeline } from "@/components/calendar/day-timeline"
import { addDays, bookingDateKey, formatDateKey, todayKey } from "@/lib/booking-time"
import { useEmployeeScheduleRange } from "@/lib/hooks/use-employee"
import { StaffHeader } from "../../staff-header"
import { mutedClass, staffScreenClass } from "../../staff-theme"

// One day of the tech's jobs, Google-Calendar style: an hour grid with each job
// drawn from its start to its end. Arrows step a day at a time; tap a job to
// open it. Opened by tapping a date in the Schedule calendar.
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

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        back
        title={formatDateKey(day, { weekday: "long", month: "short", day: "numeric" })}
        subtitle={isLoading ? " " : `${jobs.length} job${jobs.length === 1 ? "" : "s"}${day === todayKey() ? " · today" : ""}`}
      />
      <div className="space-y-3 px-5 pb-6">
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
          {day >= todayKey() ? (
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
          />
        )}
        {!isLoading && jobs.length === 0 ? <p className={`text-center text-sm ${mutedClass}`}>No jobs this day.</p> : null}
      </div>
    </div>
  )
}
