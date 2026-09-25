"use client"

import Link from "next/link"
import { useState } from "react"
import { MessageCircle, ArrowRight, Bell, CalendarDays, Clock3, MapPin, ShoppingBag, Sparkles } from "lucide-react"

import { useBookings, type Booking } from "@/lib/hooks/use-bookings"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { useAuthStore } from "@/lib/stores/auth-store"
import { hapticTap } from "@/lib/native/haptics"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { appScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../app-theme"

export default function HomeScreen() {
  const { user } = useAuthStore()
  const { data, isLoading } = useBookings(1)
  const [now] = useState(() => Date.now())

  const firstName = user?.first_name?.trim() || "there"
  const upcoming = nextUpcoming(data?.data ?? [], now)

  return (
    <div className={appScreenClass}>
      {/* Warm gradient header band - the app's signature. */}
      <div className="relative overflow-hidden px-5 pb-8 pt-[calc(2rem+env(safe-area-inset-top))]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(120% 80% at 100% 0%, rgba(240,200,211,0.55), transparent 55%), radial-gradient(90% 70% at 0% 0%, rgba(201,108,131,0.18), transparent 60%)",
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={eyebrowClass}>Beauty, at your door</p>
            <h1 className={`${displayClass} mt-2 text-[2.6rem] leading-[1.02] tracking-[-0.02em]`}>
              Hello,
              <br />
              <span className="italic text-[#C96C83]">{firstName}</span>
            </h1>
          </div>
          <NotificationBell />
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
          <h2 className={`mb-3 ${eyebrowClass}`}>What would you like to do?</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/app/book" icon={Sparkles} label="Book a service" hint="Pick a time" tone="blush" />
            <QuickAction href="/app/shop" icon={ShoppingBag} label="Shop products" hint="Delivered" tone="paper" />
            <QuickAction href="/app/bookings" icon={CalendarDays} label="My bookings" hint="Upcoming & past" tone="paper" />
            <QuickAction href="/app/account" icon={MapPin} label="My account" hint="Profile & lock" tone="paper" />
            <QuickAction href="/app/support" icon={MessageCircle} label="Chat with us" hint="Questions & help" tone="paper" />
          </div>
        </section>
      </div>
    </div>
  )
}

function NotificationBell() {
  const { data } = useNotifications(1)
  const unread = (data?.data ?? []).filter((n) => !n.read_at).length

  return (
    <Link
      href="/app/notifications"
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

function nextUpcoming(bookings: Booking[], now: number): Booking | null {
  return (
    bookings
      .filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status) && new Date(b.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null
  )
}

function NextBookingCard({ booking }: { booking: Booking }) {
  const techName = booking.employee_profile.name || "your technician"

  return (
    <Link
      href="/app/bookings"
      onClick={() => hapticTap()}
      className="block overflow-hidden rounded-3xl bg-[#14100F] p-5 text-[#F6F1EC] shadow-[0_16px_40px_-16px_rgba(20,16,15,0.5)]"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#C96C83] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em]">
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
    <Link
      href="/app/book"
      onClick={() => hapticTap()}
      className={`flex items-center justify-between gap-4 p-6 ${cardClass}`}
    >
      <div>
        <p className={`${displayClass} text-xl`}>Nothing booked yet</p>
        <p className={`mt-1 text-sm ${mutedClass}`}>Your next treatment is a tap away.</p>
      </div>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#C96C83] text-white shadow-lg shadow-[#C96C83]/25">
        <Sparkles className="size-5" aria-hidden />
      </span>
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  tone,
}: {
  href: string
  icon: typeof Sparkles
  label: string
  hint: string
  tone: "blush" | "paper"
}) {
  const blush = tone === "blush"
  return (
    <Link
      href={href}
      onClick={() => hapticTap()}
      className={
        blush
          ? "flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-[#C96C83] to-[#A9526A] p-5 text-white shadow-[0_12px_30px_-14px_rgba(201,108,131,0.7)]"
          : `flex flex-col gap-6 p-5 ${cardClass}`
      }
    >
      <Icon className={`size-6 ${blush ? "text-white" : "text-[#C96C83]"}`} aria-hidden />
      <div>
        <span className="block text-[0.95rem] font-bold leading-tight">{label}</span>
        <span className={`mt-0.5 block text-xs ${blush ? "text-white/70" : mutedClass}`}>{hint}</span>
      </div>
    </Link>
  )
}
