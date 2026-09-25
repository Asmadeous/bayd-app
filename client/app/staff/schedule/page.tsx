"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react"

import { MonthAgenda } from "@/components/calendar/month-agenda"
import { useCalendarState } from "@/lib/hooks/use-calendar-state"
import { useEmployeeProfile, useEmployeeSchedule, useEmployeeScheduleRange } from "@/lib/hooks/use-employee"
import { useLocationSharing } from "@/lib/native/use-location-sharing"
import { bookingDateKey, formatBookingDate, formatBookingTime, formatDateKey, todayKey } from "@/lib/booking-time"
import { staffScreenClass, cardClass, eyebrowClass, mutedClass, staffTheme } from "../staff-theme"
import { StaffHeader } from "../staff-header"
import { StaffBookingCard } from "../staff-booking-card"

export default function StaffScheduleScreen() {
  const [tab, setTab] = useState<"upcoming" | "past" | "calendar">("upcoming")
  const { data: profile } = useEmployeeProfile()
  // Active schedule always drives the metrics + next-appointment card.
  const { data: activeData } = useEmployeeSchedule(1)
  // The list below follows the selected tab (active vs job history).
  const { data: listData, isLoading } = useEmployeeSchedule(1, tab === "past" ? "past" : undefined)
  // on_shift is now DERIVED from clock-in (not a manual toggle). It drives live
  // location + the header line, nothing dispatch-related.
  const onShift = !!profile?.on_shift

  // Live location broadcasts while clocked in (feeds the customer ETA).
  useLocationSharing(onShift)

  const { upcoming, inProgress, next, total } = useMemo(() => {
    const bookings = activeData?.data ?? []
    const up = bookings
      .filter((b) => b.status === "confirmed" || b.status === "pending")
      .sort((a, b) => t(a.starts_at) - t(b.starts_at))
    return {
      upcoming: up,
      inProgress: bookings.filter((b) => b.status === "in_progress"),
      next: up[0] ?? null,
      total: bookings.length,
    }
  }, [activeData])

  // The list for the current tab. Active = soonest first; past comes newest-first
  // from the backend, so preserve that order.
  const listBookings = useMemo(() => {
    const bookings = listData?.data ?? []
    return tab === "past"
      ? bookings
      : bookings.slice().sort((a, b) => t(a.starts_at) - t(b.starts_at))
  }, [listData, tab])

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        title="Schedule"
        subtitle={onShift ? "You're clocked in and live." : "Your booked jobs for today."}
        action={
          <Link
            href="/staff/schedule/new"
            aria-label="New booking"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[#14100F] text-white"
          >
            <Plus className="size-5" aria-hidden />
          </Link>
        }
      />

      <div className="space-y-4 px-5">
        {/* No day-level clock: each appointment has its own Clock in/out on its
            card (geofenced to the client). Availability is your SCHEDULE. */}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <Metric icon={CalendarDays} label="Upcoming" value={upcoming.length} />
          <Metric icon={Clock3} label="In progress" value={inProgress.length} />
          <Metric icon={CheckCircle2} label="Total" value={total} />
        </div>

        {/* Next appointment */}
        {next && (
          <div className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>Next appointment</p>
            <p className="mt-1.5 text-lg font-extrabold leading-tight">{next.service?.name}</p>
            <p className={`mt-0.5 text-sm ${mutedClass}`}>
              {formatBookingDate(next.starts_at)} · {formatBookingTime(next.starts_at)}
            </p>
          </div>
        )}

        {/* Upcoming / Past toggle */}
        <div className="flex rounded-xl bg-black/[0.04] p-1">
          {(["upcoming", "past", "calendar"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize transition-colors ${
                tab === key ? "bg-white text-[#14100F] shadow-sm" : "text-[#14100F]/50"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Appointments for the selected tab */}
        {tab === "calendar" ? (
          <StaffCalendarTab />
        ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className={eyebrowClass}>{tab === "past" ? "Past bookings" : "Assigned appointments"}</h2>
            <span className={`text-xs ${mutedClass}`}>{listBookings.length} shown</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-black/5" />
              ))}
            </div>
          ) : listBookings.length === 0 ? (
            <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
              <MapPin className="size-7 text-[#C96C83]" aria-hidden />
              <p className="font-bold">{tab === "past" ? "No past bookings" : "No appointments"}</p>
              <p className={`text-sm ${mutedClass}`}>
                {tab === "past"
                  ? "Completed, cancelled, and no-show jobs appear here."
                  : "Appointments assigned to you appear here."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {listBookings.map((b) => (
                <StaffBookingCard key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

// Month view of the tech's jobs (past and cancelled included): tap a day to see
// its jobs with the normal job cards (clock in/out, charge, navigate), or add a
// manual booking on a future day. No reschedule/cancel for staff.
function StaffCalendarTab() {
  const state = useCalendarState("month")
  const { data = [], isLoading } = useEmployeeScheduleRange(state.from, state.to)
  const [selected, setSelected] = useState(() => todayKey())
  const dayList = data
    .filter((b) => bookingDateKey(b.starts_at) === selected)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return (
    <div className="space-y-4">
      <MonthAgenda state={state} bookings={data} selected={selected} onSelect={setSelected} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">
          {formatDateKey(selected, { weekday: "long", month: "long", day: "numeric" })}
        </h2>
        {selected >= todayKey() ? (
          <Link href={`/staff/schedule/new?date=${selected}`} className="rounded-full bg-[#14100F] px-4 py-2 text-xs font-bold text-white">
            Add booking
          </Link>
        ) : null}
      </div>
      {isLoading ? (
        <div className="h-36 animate-pulse rounded-2xl bg-black/5" />
      ) : dayList.length === 0 ? (
        <p className={`${cardClass} px-4 py-6 text-center text-sm ${mutedClass}`}>No jobs this day.</p>
      ) : (
        <ul className="space-y-3">
          {dayList.map((b) => (
            <StaffBookingCard key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CalendarDays
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className={`${cardClass} p-4`}>
      <Icon
        className="size-5"
        style={{ color: accent ? staffTheme.live : staffTheme.blush }}
        aria-hidden
      />
      <p className="mt-2 text-2xl font-black leading-none">{value}</p>
      <p className={`mt-1 text-xs ${mutedClass}`}>{label}</p>
    </div>
  )
}

function t(value: string) {
  const n = new Date(value).getTime()
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}
