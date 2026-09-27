"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Bell,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react"

import { DateStrip, weekRange } from "@/components/booking/date-strip"
import { BookingRow } from "@/components/calendar/booking-row"
import { LoadMore } from "@/components/load-more"
import { ViewSwitch, WhenFilter, type BookingView } from "@/components/calendar/view-switch"
import { useEmployeeProfile, useEmployeeSchedule, useEmployeeScheduleList, useEmployeeScheduleRange } from "@/lib/hooks/use-employee"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { useAuthStore } from "@/lib/stores/auth-store"
import { hapticTap } from "@/lib/native/haptics"
import { useLocationSharing } from "@/lib/native/use-location-sharing"
import { bookingDateKey, todayKey } from "@/lib/booking-time"
import { staffScreenClass, cardClass, eyebrowClass, mutedClass, staffTheme } from "../staff-theme"
import { StaffHeader } from "../staff-header"

export default function StaffScheduleScreen() {
  // Which jobs (upcoming / past) is separate from how they're laid out.
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming")
  const [view, setView] = useState<BookingView>("list")
  const { data: profile } = useEmployeeProfile()
  const { user } = useAuthStore()
  const firstName = user?.first_name?.trim() || profile?.name || "there"
  // Active schedule always drives the metrics.
  const { data: activeData } = useEmployeeSchedule(1)
  // The list below follows the filter (active jobs vs job history), paged.
  const { items: listBookings, isLoading, hasMore, loadingMore, loadMore } = useEmployeeScheduleList(
    when === "past" ? "past" : undefined,
  )
  // on_shift is now DERIVED from clock-in (not a manual toggle). It drives live
  // location + the header line, nothing dispatch-related.
  const onShift = !!profile?.on_shift

  // Live location broadcasts while clocked in (feeds the customer ETA).
  useLocationSharing(onShift)

  // Counts over ALL active jobs, not just the first page: the total from the
  // server, less the ones in service (never more than a couple at once).
  const inProgressCount = (activeData?.data ?? []).filter((b) => b.status === "in_progress").length
  const upcomingCount = (activeData?.pagination.total_count ?? 0) - inProgressCount

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        greeting={firstName}
        subtitle={
          onShift
            ? "You're clocked in and live."
            : when === "past"
              ? "Jobs you've done."
              : view === "calendar"
                ? "Your jobs by day."
                : "Your upcoming appointments."
        }
        // The calendar has its own Add booking (with the tapped date filled in).
        action={
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            {view === "calendar" ? null : (
              <Link
                href="/staff/schedule/new"
                aria-label="New booking"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[#14100F] text-white"
              >
                <Plus className="size-5" aria-hidden />
              </Link>
            )}
          </div>
        }
      />

      <div className="space-y-4 px-5">
        {/* No day-level clock: each appointment has its own Clock in/out on its
            card (geofenced to the client). Availability is your SCHEDULE. */}

        {/* Metrics */}
        {/* The next appointment is the first card in the list below, so no
            separate "next" card or total here. */}
        {when === "upcoming" && view !== "calendar" ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric icon={CalendarDays} label="Upcoming" value={upcomingCount} />
            <Metric icon={Clock3} label="In progress" value={inProgressCount} />
          </div>
        ) : null}

        {/* Which jobs + how to lay them out. A calendar shows every day, so the
            upcoming / past filter only applies to the list. */}
        <div className="flex items-center gap-3">
          {view === "calendar" ? <div className="flex-1" /> : <WhenFilter value={when} onChange={setWhen} />}
          <ViewSwitch value={view} onChange={setView} />
        </div>

        {view === "calendar" ? (
          <StaffCalendarTab />
        ) : (
        <div>
          <h2 className={`mb-2 ${eyebrowClass}`}>{when === "past" ? "Past bookings" : "Assigned appointments"}</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-black/5" />
              ))}
            </div>
          ) : listBookings.length === 0 ? (
            <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
              <MapPin className="size-7 text-[#C96C83]" aria-hidden />
              <p className="font-bold">{when === "past" ? "No past bookings" : "No appointments"}</p>
              <p className={`text-sm ${mutedClass}`}>
                {when === "past"
                  ? "Completed, cancelled, and no-show jobs appear here."
                  : "Appointments assigned to you appear here."}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {listBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} who={b.customer_name} href={`/staff/schedule/job?id=${b.id}`} />
                ))}
              </ul>
              <LoadMore className="mt-3" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

// Calendar view: the booking week strip (expands to the month) with a dot on days
// that have jobs. Tapping a day opens its Day page (hour grid).
function StaffCalendarTab() {
  const router = useRouter()
  const [range, setRange] = useState(() => weekRange(todayKey()))
  const { data = [] } = useEmployeeScheduleRange(range.from, range.to)
  const marks = new Set(data.map((b) => bookingDateKey(b.starts_at)))

  return (
    <div className="space-y-3">
      <div className={`${cardClass} p-4`}>
        <DateStrip
          value={todayKey()}
          onChange={(day) => router.push(`/staff/schedule/day?date=${day}`)}
          allowPast
          marks={marks}
          onVisibleRangeChange={(from, to) => setRange({ from, to })}
        />
      </div>
      <p className={`px-1 text-center text-xs ${mutedClass}`}>Tap a day to open it.</p>
    </div>
  )
}

function NotificationBell() {
  const { data } = useNotifications(1)
  const unread = data?.unread_count ?? 0

  return (
    <Link
      href="/staff/notifications"
      onClick={() => hapticTap()}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-sm"
    >
      <Bell className="size-5 text-[#14100F]" aria-hidden />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#C96C83] px-1 text-[0.62rem] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
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
