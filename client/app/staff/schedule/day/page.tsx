"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { addDays, formatDateKey, todayKey } from "@/lib/booking-time"
import { DaySchedule } from "../day-schedule"
import { StaffHeader } from "../../staff-header"
import { staffScreenClass } from "../../staff-theme"

// One day of the tech's jobs on its own screen, with arrows to step a day at a
// time. The same hour grid sits under the Schedule calendar.
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
  const go = (d: string) => router.replace(`/staff/schedule/day?date=${d}`)
  const editable = day >= todayKey()

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        back
        title={formatDateKey(day, { weekday: "long", month: "short", day: "numeric" })}
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
          {editable ? (
            <Link href={`/staff/schedule/new?date=${day}`} className="ml-auto rounded-full bg-[#14100F] px-4 py-2 text-sm font-bold text-white">
              Add booking
            </Link>
          ) : null}
        </div>

        <DaySchedule day={day} />
      </div>
    </div>
  )
}
