"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Bell, CalendarDays, Clock3, MapPin, Plus } from "lucide-react"

import { DateStrip, weekRange } from "@/components/booking/date-strip"
import { BookingRow } from "@/components/calendar/booking-row"
import { LoadMore } from "@/components/load-more"
import { ViewSwitch, type BookingView } from "@/components/calendar/view-switch"
import { useEmployeeProfile, useEmployeeScheduleList, useEmployeeScheduleRange } from "@/lib/hooks/use-employee"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { useAuthStore } from "@/lib/stores/auth-store"
import { hapticTap } from "@/lib/native/haptics"
import { useLocationSharing } from "@/lib/native/use-location-sharing"
import { bookingDateKey, formatBookingDate, formatBookingTime, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { staffScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

// Schedule is the tech's upcoming work: the next job up top, then every active
// job as a list or calendar. Past jobs live under the Manage tab.
export default function StaffScheduleScreen() {
  const [view, setView] = useState<BookingView>("list")
  const { data: profile } = useEmployeeProfile()
  const { user } = useAuthStore()
  const firstName = user?.first_name?.trim() || profile?.name || "there"
  const { items: listBookings, isLoading, hasMore, loadingMore, loadMore } = useEmployeeScheduleList()
  // Active jobs come soonest first, so the first is the next one.
  const next = listBookings[0] ?? null
  // on_shift is now DERIVED from clock-in (not a manual toggle). It drives live
  // location, nothing dispatch-related.
  const onShift = !!profile?.on_shift

  // Live location broadcasts while clocked in (feeds the customer ETA).
  useLocationSharing(onShift)

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        greeting={firstName}
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

        {view !== "calendar" ? (
          <section>
            <h2 className={`mb-2 ${eyebrowClass}`}>Next appointment</h2>
            {isLoading ? (
              <div className="h-36 animate-pulse rounded-3xl bg-black/[0.04]" />
            ) : next ? (
              <NextJobCard booking={next} />
            ) : (
              <div className={`${cardClass} p-6`}>
                <p className={`${displayClass} text-xl`}>Nothing booked yet</p>
                <p className={`mt-1 text-sm ${mutedClass}`}>New jobs assigned to you show up here.</p>
              </div>
            )}
          </section>
        ) : null}

        <div className="flex items-center justify-end">
          <ViewSwitch value={view} onChange={setView} />
        </div>

        {view === "calendar" ? (
          <StaffCalendarTab />
        ) : (
        <div>
          <h2 className={`mb-2 ${eyebrowClass}`}>Assigned appointments</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-black/5" />
              ))}
            </div>
          ) : listBookings.length === 0 ? (
            <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
              <MapPin className="size-7 text-[#C96C83]" aria-hidden />
              <p className="font-bold">No appointments</p>
              <p className={`text-sm ${mutedClass}`}>Appointments assigned to you appear here.</p>
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
      <p className={`px-1 text-center text-sm ${mutedClass}`}>Tap a day to open it.</p>
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
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#C96C83] px-1 text-[0.75rem] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  )
}

function NextJobCard({ booking }: { booking: Booking }) {
  const where = booking.address ? [booking.address.line1, booking.address.city].filter(Boolean).join(", ") : null
  const live = booking.status === "in_progress"

  return (
    <Link
      href={`/staff/schedule/job?id=${booking.id}`}
      onClick={() => hapticTap()}
      className="block overflow-hidden rounded-3xl bg-[#14100F] p-5 text-[#F6F1EC] shadow-[0_16px_40px_-16px_rgba(20,16,15,0.5)]"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#C96C83] px-3 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.1em]">
          {live ? "In progress" : booking.status.replace("_", " ")}
        </span>
        <ArrowRight className="size-5 text-[#F6F1EC]/60" aria-hidden />
      </div>
      <p className={`${displayClass} mt-4 text-2xl leading-tight`}>{booking.service.name}</p>
      {booking.customer_name ? <p className="mt-1 text-base text-[#F6F1EC]/80">{booking.customer_name}</p> : null}
      <div className="mt-3 space-y-1.5 text-base text-[#F6F1EC]/80">
        <p className="flex items-center gap-2.5">
          <CalendarDays className="size-5 text-[#F0C8D3]" aria-hidden />
          {formatBookingDate(booking.starts_at, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <p className="flex items-center gap-2.5">
          <Clock3 className="size-5 text-[#F0C8D3]" aria-hidden />
          {formatBookingTime(booking.starts_at)} · {booking.service.duration_minutes} min
        </p>
        {where ? (
          <p className="flex items-center gap-2.5">
            <MapPin className="size-5 shrink-0 text-[#F0C8D3]" aria-hidden />
            <span className="truncate">{where}</span>
          </p>
        ) : null}
      </div>
    </Link>
  )
}
