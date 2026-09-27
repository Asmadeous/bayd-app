"use client"

import Link from "next/link"
import { ArrowRight, Bell, CalendarDays, Clock3, Plus } from "lucide-react"

import { useBookingsList, type Booking } from "@/lib/hooks/use-bookings"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { useAuthStore } from "@/lib/stores/auth-store"
import { hapticTap } from "@/lib/native/haptics"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { BookingsPanel } from "../bookings/page"
import { appScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../app-theme"

export default function HomeScreen() {
  const { user } = useAuthStore()
  // The soonest upcoming booking (the server sorts upcoming soonest first).
  const { items, isLoading } = useBookingsList("upcoming")
  const upcoming = items[0] ?? null

  const firstName = user?.first_name?.trim() || "there"

  return (
    <div className={appScreenClass}>
      {/* Warm gradient header band - the app's signature. */}
      <div className="relative overflow-hidden px-5 pb-8 pt-[calc(2rem+var(--top-inset))]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(120% 80% at 100% 0%, rgba(240,200,211,0.55), transparent 55%), radial-gradient(90% 70% at 0% 0%, rgba(201,108,131,0.18), transparent 60%)",
          }}
        />
        <p className={eyebrowClass}>Beauty, at your door</p>
        {/* The buttons sit on the greeting's line, not the eyebrow's. */}
        <div className="mt-2 flex items-center justify-between gap-3">
          {/* One line; a long name wraps onto the next. */}
          <h1 className={`${displayClass} min-w-0 break-words text-[2.2rem] leading-tight tracking-[-0.02em]`}>
            Hello, <span className="text-[#C96C83]">{firstName}</span>
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            {/* Booking starts here (there's no Book tab). */}
            <Link
              href="/app/book"
              onClick={() => hapticTap()}
              aria-label="Book now"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[#14100F] text-white"
            >
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-7 px-5">
        <section>
          <h2 className={`mb-3 ${eyebrowClass}`}>Next appointment</h2>
          {isLoading ? (
            <div className="h-36 animate-pulse rounded-3xl bg-black/[0.04]" />
          ) : upcoming ? (
            <NextBookingCard booking={upcoming} />
          ) : (
            <EmptyNext />
          )}
        </section>

        <section>
          <h2 className={`mb-3 ${eyebrowClass}`}>My bookings</h2>
          <BookingsPanel />
        </section>
      </div>
    </div>
  )
}

function NotificationBell() {
  const { data } = useNotifications(1)
  const unread = data?.unread_count ?? 0

  return (
    <Link
      href="/app/notifications"
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

function NextBookingCard({ booking }: { booking: Booking }) {
  const techName = booking.employee_profile.name || "your technician"

  return (
    <Link
      href={`/app/bookings/view?id=${booking.id}`}
      onClick={() => hapticTap()}
      className="block overflow-hidden rounded-3xl bg-[#14100F] p-5 text-[#F6F1EC] shadow-[0_16px_40px_-16px_rgba(20,16,15,0.5)]"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#C96C83] px-3 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.14em]">
          {booking.status.replace("_", " ")}
        </span>
        <ArrowRight className="size-4 text-[#F6F1EC]/50" aria-hidden />
      </div>
      <p className={`${displayClass} mt-4 text-2xl leading-tight`}>{booking.service.name}</p>
      <div className="mt-3 space-y-1.5 text-sm text-[#F6F1EC]/75">
        <p className="flex items-center gap-2.5">
          <CalendarDays className="size-[1.05rem] text-[#F0C8D3]" aria-hidden />
          {formatBookingDate(booking.starts_at, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <p className="flex items-center gap-2.5">
          <Clock3 className="size-[1.05rem] text-[#F0C8D3]" aria-hidden />
          {formatBookingTime(booking.starts_at)} · {booking.service.duration_minutes} min with {techName}
        </p>
      </div>
    </Link>
  )
}

function EmptyNext() {
  return (
    <div className={`p-6 ${cardClass}`}>
      <p className={`${displayClass} text-xl`}>No appointments available</p>
      <p className={`mt-1 text-sm ${mutedClass}`}>Tap + to book one.</p>
    </div>
  )
}
