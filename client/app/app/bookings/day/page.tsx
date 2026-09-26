"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { BookingRow } from "@/components/calendar/booking-row"
import { bookingDateKey, formatDateKey, todayKey } from "@/lib/booking-time"
import { useBookingsRange } from "@/lib/hooks/use-bookings"
import { SectionScreen } from "../../section-screen"

// A day with more than one appointment, opened from the calendar: each one as a
// row that opens the appointment. useSearchParams needs a Suspense boundary for
// the static app export.
export default function DayScreen() {
  return (
    <Suspense>
      <Day />
    </Suspense>
  )
}

function Day() {
  const day = useSearchParams().get("date") ?? todayKey()
  const { data = [], isLoading } = useBookingsRange(day, day)
  const list = data
    .filter((b) => bookingDateKey(b.starts_at) === day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return (
    <SectionScreen title={formatDateKey(day, { weekday: "long", month: "short", day: "numeric" })}>
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-black/5" />
      ) : (
        <ul className="space-y-3 pb-6">
          {list.map((b) => (
            <BookingRow key={b.id} booking={b} who={b.employee_profile.name} href={`/app/bookings/view?id=${b.id}`} />
          ))}
        </ul>
      )}
      {day >= todayKey() ? (
        <Link href={`/app/book?date=${day}`} className="mb-6 block rounded-xl bg-[#101217] py-3 text-center text-sm font-bold text-white">
          Book another on this day
        </Link>
      ) : null}
    </SectionScreen>
  )
}
