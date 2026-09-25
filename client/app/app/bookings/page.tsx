"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CalendarDays, Clock3, Lock, MessageCircle, Navigation, Star, Video } from "lucide-react"

import api from "@/lib/api"
import { useBookings, useBookingsRange, useCancelBooking, type Booking } from "@/lib/hooks/use-bookings"
import { useCalendarState } from "@/lib/hooks/use-calendar-state"
import { useBookingAccess, windowNotStartedMessage } from "@/lib/booking-access"
import { MonthAgenda } from "@/components/calendar/month-agenda"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { useStartMeeting } from "@/lib/hooks/use-meetings"
import type { Conversation } from "@/lib/cable/chat-types"
import { bookingDateKey, formatBookingDate, formatBookingTime, formatDateKey, todayKey } from "@/lib/booking-time"
import { appScreenClass } from "../app-theme"
import { AppHeader } from "../app-header"
import { RescheduleSheet } from "./reschedule-sheet"
import { ReviewSheet } from "./review-sheet"

const ACTIVE = ["pending", "confirmed", "in_progress"]

export default function BookingsScreen() {
  const { data, isLoading } = useBookings(1)
  const [tab, setTab] = useState<"upcoming" | "past" | "calendar">("upcoming")
  // "Now" captured once at mount via a lazy initializer so render stays pure.
  const [now] = useState(() => Date.now())

  const { upcoming, past } = useMemo(() => {
    const all = data?.data ?? []
    return {
      upcoming: all
        .filter((b) => ACTIVE.includes(b.status) && new Date(b.starts_at).getTime() >= now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
      past: all
        .filter((b) => !ACTIVE.includes(b.status) || new Date(b.starts_at).getTime() < now)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    }
  }, [data, now])

  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : []

  return (
    <div className={appScreenClass}>
      <AppHeader title="My bookings" />

      <div className="px-5">
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-full bg-black/5 p-1">
          {(["upcoming", "past", "calendar"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-[#101217] text-white" : "text-[#101217]/55"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "calendar" ? (
          <CalendarTab now={now} />
        ) : isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyBookings tab={tab} />
        ) : (
          <ul className="space-y-3">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} cancellable={tab === "upcoming"} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Month view of the customer's bookings: tap a day to see that day's
// appointments with the same cards (reschedule / cancel / message / meet) as the
// list, or book a future day.
function CalendarTab({ now }: { now: number }) {
  const state = useCalendarState("month")
  const { data = [], isLoading } = useBookingsRange(state.from, state.to)
  const [selected, setSelected] = useState(() => todayKey())
  const dayList = data
    .filter((b) => bookingDateKey(b.starts_at) === selected)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return (
    <div className="space-y-4">
      <MonthAgenda state={state} bookings={data} selected={selected} onSelect={setSelected} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-[#101217]">
          {formatDateKey(selected, { weekday: "long", month: "long", day: "numeric" })}
        </h2>
        {selected >= todayKey() ? (
          <Link href={`/app/book?date=${selected}`} className="rounded-full bg-[#101217] px-4 py-2 text-xs font-bold text-white">
            Book this day
          </Link>
        ) : null}
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-black/5" />
      ) : dayList.length === 0 ? (
        <p className="rounded-2xl bg-black/[0.03] px-4 py-6 text-center text-sm text-[#101217]/55">No appointments this day.</p>
      ) : (
        <ul className="space-y-3">
          {dayList.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              cancellable={ACTIVE.includes(b.status) && new Date(b.starts_at).getTime() >= now}
              now={now}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function BookingCard({ booking, cancellable, now }: { booking: Booking; cancellable: boolean; now: number }) {
  const techName = booking.employee_profile.name || "Your technician"
  const { toast } = useToast()
  const confirm = useConfirm()
  const [rescheduling, setRescheduling] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const cancelBooking = useCancelBooking()
  const access = useBookingAccess(booking)
  // Self-reschedule is capped at 2 per booking (backend enforces; hide when spent).
  const canReschedule = booking.reschedule_count < 2 && ["pending", "confirmed"].includes(booking.status)
  // Self-cancel: only pending/confirmed and at least 24h before the start (the
  // backend enforces the same cutoff). Hidden otherwise - "call us" for late changes.
  const cutoff = new Date(booking.starts_at).getTime() - 24 * 60 * 60 * 1000
  const canCancel = ["pending", "confirmed"].includes(booking.status) && now < cutoff
  // Review a completed booking once (has_review from the serializer).
  const canReview = booking.status === "completed" && !booking.has_review

  async function onCancel() {
    // Dangerous, irreversible -> real modal confirmation, not an inline toggle.
    const ok = await confirm({
      title: "Cancel appointment?",
      message: `Your ${booking.service.name} on ${formatBookingDate(booking.starts_at)} will be cancelled. This can't be undone.`,
      confirmLabel: "Cancel appointment",
      cancelLabel: "Keep it",
      tone: "danger",
    })
    if (!ok) return
    try {
      await cancelBooking.mutateAsync({ id: booking.id })
      toast({ title: "Appointment cancelled", variant: "success" })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({ title: "Couldn't cancel", description: msg ?? "Please try again.", variant: "error" })
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] ${statusStyle(
            booking.status,
          )}`}
        >
          {booking.status.replace("_", " ")}
        </span>
        <span className="text-sm font-extrabold">${Number(booking.total).toFixed(2)}</span>
      </div>

      <p className="mt-3 text-lg font-extrabold">{booking.service.name}</p>
      <div className="mt-1.5 space-y-1 text-sm text-[#101217]/60">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#c96c83]" aria-hidden />
          {formatBookingDate(booking.starts_at)}
          {" · "}
          {formatBookingTime(booking.starts_at)}
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 text-[#c96c83]" aria-hidden />
          {booking.service.duration_minutes} min with {techName}
        </p>
      </div>

      {cancellable && booking.meeting_recommended && <MeetAction booking={booking} />}

      {/* Messaging and live tracking open 30 minutes before the appointment. */}
      {cancellable && booking.employee_profile.user_id && access.active && !access.open ? (
        <button
          type="button"
          onClick={() =>
            toast({
              title: "Not open yet",
              description: windowNotStartedMessage(access.opensLabel, "message and track your technician"),
              variant: "error",
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black/[0.04] py-2.5 text-xs font-semibold text-[#101217]/60"
        >
          <Lock className="size-3.5" aria-hidden />
          Message &amp; tracking open at {access.opensLabel}
        </button>
      ) : null}

      {cancellable && access.open && booking.employee_profile.user_id ? <MessageTechAction techUserId={booking.employee_profile.user_id} /> : null}

      {cancellable && access.open && ["confirmed", "in_progress"].includes(booking.status) && (
        <Link
          href={`/app/bookings/track?id=${booking.id}`}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#101217] py-2.5 text-sm font-bold text-white"
        >
          <Navigation className="size-4" aria-hidden />
          Track your tech
        </Link>
      )}

      {/* Customers can reschedule (same tech, open slot) or cancel - both up to
          24h before the appointment; within that window they call us. */}
      {cancellable && (canReschedule || canCancel) && (
        <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
          {canReschedule && (
            <button
              type="button"
              onClick={() => setRescheduling(true)}
              className="block w-full rounded-lg border border-black/15 py-2 text-center text-sm font-semibold"
            >
              Reschedule
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelBooking.isPending}
              className="block w-full rounded-lg py-2 text-center text-sm font-semibold text-[#8f3f4b] disabled:opacity-50"
            >
              {cancelBooking.isPending ? "Cancelling…" : "Cancel appointment"}
            </button>
          )}
        </div>
      )}

      {/* Rate a completed service (star rating + optional comment). */}
      {canReview && (
        <div className="mt-3 border-t border-black/10 pt-3">
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C96C83] py-2.5 text-sm font-bold text-white"
          >
            <Star className="size-4" aria-hidden />
            Rate your service
          </button>
        </div>
      )}

      {rescheduling && <RescheduleSheet booking={booking} onClose={() => setRescheduling(false)} />}
      {reviewing && <ReviewSheet booking={booking} onClose={() => setReviewing(false)} />}
    </li>
  )
}

// Work-scope video call action, shown only on bookings the backend flags with
// meeting_recommended (special-needs or first-time clients). Join the existing
// call if one is scheduled, otherwise create it (idempotent) first. Either way
// it opens the EMBEDDED in-app Jitsi call screen - no browser hop.
function MeetAction({ booking }: { booking: Booking }) {
  const router = useRouter()
  const startMeeting = useStartMeeting()
  const meeting = booking.meeting

  async function scheduleAndJoin() {
    try {
      await startMeeting.mutateAsync(booking.id)
      router.push(`/app/bookings/call?id=${booking.id}`)
    } catch {
      // Surfaced by startMeeting.isError below.
    }
  }

  if (meeting && meeting.status === "scheduled") {
    return (
      <Link
        href={`/app/bookings/call?id=${booking.id}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c96c83] py-2.5 text-sm font-bold text-white"
      >
        <Video className="size-4" aria-hidden />
        Join video call
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={scheduleAndJoin}
      disabled={startMeeting.isPending}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#c96c83]/40 py-2.5 text-sm font-semibold text-[#c96c83] disabled:opacity-50"
    >
      <Video className="size-4" aria-hidden />
      {startMeeting.isPending ? "Setting up…" : "Set up work-scope call"}
    </button>
  )
}

// Opens (or reuses) the conversation with this booking's technician, then jumps
// to the live thread. Mirrors the desktop MessageTechButton on the shared
// find-or-create POST /conversations { user_id } contract.
function MessageTechAction({ techUserId }: { techUserId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function open() {
    setLoading(true)
    try {
      const { data } = await api.post<Conversation>("/conversations", { user_id: techUserId })
      router.push(`/app/messages/thread?id=${data.id}`)
    } catch {
      // Fall back to the list; any existing thread still shows there.
      router.push("/app/messages")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 py-2.5 text-sm font-semibold text-[#101217] disabled:opacity-50"
    >
      <MessageCircle className="size-4 text-[#c96c83]" aria-hidden />
      {loading ? "Opening…" : "Message your tech"}
    </button>
  )
}

function statusStyle(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-[#c96c83]/12 text-[#c96c83]"
    case "in_progress":
      return "bg-[#101217] text-white"
    case "completed":
      return "bg-black/8 text-[#101217]/60"
    case "cancelled":
    case "no_show":
      return "bg-[#8f3f4b]/12 text-[#8f3f4b]"
    case "missed":
      return "bg-[#101217] text-white"
    default:
      return "bg-black/8 text-[#101217]/60"
  }
}

function EmptyBookings({ tab }: { tab: "upcoming" | "past" }) {
  if (tab === "past") {
    return <p className="rounded-2xl bg-white p-6 text-center text-sm text-[#101217]/50">No past appointments yet.</p>
  }
  return (
    <Link
      href="/app/book"
      className="flex items-center justify-between rounded-2xl border border-dashed border-black/15 bg-white/50 p-5"
    >
      <div>
        <p className="font-bold">Nothing booked</p>
        <p className="mt-0.5 text-sm text-[#101217]/50">Tap to book a service.</p>
      </div>
      <span className="rounded-full bg-[#c96c83] px-3 py-1.5 text-sm font-bold text-white">Book</span>
    </Link>
  )
}
