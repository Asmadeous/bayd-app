"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { History, Lock, MessageCircle, Navigation, Star, Video } from "lucide-react"

import api from "@/lib/api"
import { useBookingsList, useBookingsRange, useCancelBooking, type Booking } from "@/lib/hooks/use-bookings"
import { useBookingAccess, windowNotStartedMessage } from "@/lib/booking-access"
import { BookingRow } from "@/components/calendar/booking-row"
import { LoadMore } from "@/components/load-more"
import { DateStrip, weekRange } from "@/components/booking/date-strip"
import { ViewSwitch, type BookingView } from "@/components/calendar/view-switch"
import { cn } from "@/lib/utils"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { useStartMeeting } from "@/lib/hooks/use-meetings"
import type { Conversation } from "@/lib/cable/chat-types"
import { bookingDateKey, formatBookingDate, formatDateKey, todayKey } from "@/lib/booking-time"
import { appScreenClass } from "../app-theme"
import { AppHeader } from "../app-header"
import { EmptyState } from "../empty-state"
import { RescheduleSheet } from "./reschedule-sheet"
import { ReviewSheet } from "./review-sheet"

export const ACTIVE = ["pending", "confirmed", "in_progress"]

export default function BookingsScreen() {
  return (
    <div className={appScreenClass}>
      <AppHeader title="My bookings" />
      <div className="px-5">
        <BookingsPanel />
      </div>
    </div>
  )
}

// The customer's bookings. Upcoming (Home and this screen) switches between a
// list and a calendar; past bookings live under the Management tab as a list.
// `action` sits at the right end of the view-switch row (Home puts Book now there).
export function BookingsPanel({
  tab = "upcoming",
  action,
}: {
  tab?: "upcoming" | "past"
  action?: React.ReactNode
}) {
  const [view, setView] = useState<BookingView>("list")
  const { items: list, isLoading, hasMore, loadingMore, loadMore } = useBookingsList(tab, {
    enabled: tab === "past" || view === "list",
  })

  return (
    <div>
        {tab === "upcoming" ? (
          <div className={cn("mb-4 flex items-center gap-3", action ? "justify-between" : "justify-end")}>
            <ViewSwitch value={view} onChange={setView} />
            {action}
          </div>
        ) : null}

        {view === "calendar" ? (
          <CalendarTab />
        ) : isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyBookings tab={tab} />
        ) : (
          <>
            <ul className="space-y-3">
              {list.map((b) => (
                <BookingRow key={b.id} booking={b} who={b.employee_profile.name} href={`/app/bookings/view?id=${b.id}`} />
              ))}
            </ul>
            <LoadMore className="mt-3" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
          </>
        )}
    </div>
  )
}

// Calendar view: the booking week strip (expands to the month) with a dot on days
// that have bookings. Tapping a day with one appointment opens it; with several,
// opens that day's list; an empty day offers to book it.
function CalendarTab() {
  const router = useRouter()
  const [emptyDay, setEmptyDay] = useState<string | null>(null)
  const [range, setRange] = useState(() => weekRange(todayKey()))
  const { data = [] } = useBookingsRange(range.from, range.to)
  const marks = new Set(data.map((b) => bookingDateKey(b.starts_at)))

  function openDay(day: string) {
    const onDay = data.filter((b) => bookingDateKey(b.starts_at) === day)
    if (onDay.length === 1) router.push(`/app/bookings/view?id=${onDay[0].id}`)
    else if (onDay.length > 1) router.push(`/app/bookings/day?date=${day}`)
    else setEmptyDay(day)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <DateStrip
          value={emptyDay ?? todayKey()}
          onChange={openDay}
          allowPast
          marks={marks}
          onVisibleRangeChange={(from, to) => setRange({ from, to })}
        />
      </div>
      {emptyDay ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.03] px-4 py-4">
          <p className="text-sm text-[#101217]/60">
            No appointments on {formatDateKey(emptyDay, { weekday: "long", month: "short", day: "numeric" })}.
          </p>
          {emptyDay >= todayKey() ? (
            <Link href={`/app/book?date=${emptyDay}`} className="shrink-0 rounded-full bg-[#101217] px-4 py-2 text-sm font-bold text-white">
              Book this day
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-sm text-[#101217]/50">Tap a day to open it. Dots mark your appointments.</p>
      )}
    </div>
  )
}

// What a customer can do with an appointment: join the video call, message and
// track the tech (from 30 minutes before), reschedule or cancel (up to 24h
// before), and rate it once done. Shared by the booking card and the
// appointment screen.
export function AppointmentActions({ booking, cancellable, now }: { booking: Booking; cancellable: boolean; now: number }) {
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
    <>
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black/[0.04] py-2.5 text-sm font-semibold text-[#101217]/60"
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
              className="block w-full rounded-lg bg-[#C96C83]/10 py-2.5 text-center text-sm font-bold text-[#9E4A60] transition-colors active:bg-[#C96C83]/20"
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
    </>
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
      router.push("/app/chat")
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

export function statusStyle(status: string) {
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
    return <EmptyState icon={History} title="No past bookings" text="Completed and cancelled appointments appear here." />
  }
  return (
    <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-[#101217]/55">
      No appointments available
    </p>
  )
}
