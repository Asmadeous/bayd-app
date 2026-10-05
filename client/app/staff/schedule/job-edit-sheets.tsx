"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"

import { DateStrip } from "@/components/booking/date-strip"
import { formatTime, TimeGroups } from "@/components/booking/time-groups"
import { BubbleLoader } from "@/components/bubble-loader"
import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { bookingDateKey, formatBookingDate, formatBookingTime, formatDateKey, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useStaffCancel, useStaffReschedule } from "@/lib/hooks/use-employee"
import { cardClass, mutedClass } from "../staff-theme"

export function apiError(e: unknown) {
  const d = e as { response?: { data?: { error?: string } }; message?: string }
  return d?.response?.data?.error ?? d?.message ?? "Please try again."
}

const field = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base"

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-[#14100F]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#14100F]/50">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p aria-live="polite" className="mb-3 rounded-xl border border-[#8f3f4b]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
      {message}
    </p>
  )
}

// The tech moves their own job. Open times come from /availability for this
// tech, so they already allow travel between jobs; "Other time" covers a time the
// tech has agreed with the client outside those slots (the API still checks
// hours, travel and double-booking, and explains any refusal).
export function StaffRescheduleSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { toast } = useToast()
  const reschedule = useStaffReschedule()
  const [date, setDate] = useState(() => {
    const current = bookingDateKey(booking.starts_at)
    return current < todayKey() ? todayKey() : current
  })
  const [time, setTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const client = booking.customer_name ?? "The client"

  const availability = useQuery<{ slots: string[] }>({
    queryKey: ["availability", booking.service.id, booking.employee_profile.id, date],
    queryFn: () =>
      api
        .get<{ slots: string[] }>("/availability", {
          params: { service_id: booking.service.id, employee_id: booking.employee_profile.id, date },
        })
        .then((r) => r.data),
  })
  const slots = availability.data?.slots ?? []

  function pickDate(d: string) {
    setDate(d)
    setTime("")
    setError(null)
  }

  async function submit() {
    setError(null)
    try {
      const moved = await reschedule.mutateAsync({ bookingId: booking.id, startsAt: `${date}T${time}:00` })
      toast({
        title: "Job moved",
        description: `Now ${formatBookingDate(moved.starts_at)} at ${formatBookingTime(moved.starts_at)}. ${client} has been told.`,
        variant: "success",
      })
      onClose()
    } catch (e: unknown) {
      setError(apiError(e))
    }
  }

  return (
    <Sheet title="Reschedule" onClose={onClose}>
      <p className={`mb-1 text-sm ${mutedClass}`}>
        Now {formatBookingDate(booking.starts_at)} at {formatBookingTime(booking.starts_at)}.
      </p>
      <p className={`mb-4 text-sm ${mutedClass}`}>
        Pick a new time for {booking.service.name}. It stays on your schedule, and {client} is told the new time
        automatically. Agree it with them first if you can.
      </p>

      <DateStrip value={date} onChange={pickDate} />
      <p className={`mt-1 text-center text-sm ${mutedClass}`}>Times are shown in Eastern time.</p>

      <h3 className="mt-4 border-t border-black/10 pt-4 text-base font-black tracking-tight">
        {date === todayKey() ? "Today, " : ""}
        {formatDateKey(date, { weekday: "long", month: "short", day: "numeric" })}
      </h3>
      <p className={`mt-1 text-sm ${mutedClass}`}>Your open times, with travel between jobs already allowed for.</p>
      <div className="mt-3">
        {availability.isLoading ? (
          <BubbleLoader className="py-4" label="Finding your open times" />
        ) : slots.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No open times that day. Try another date, or enter a time below.</p>
        ) : (
          <TimeGroups times={slots} selected={time} onPick={(t) => { setTime(t); setError(null) }} />
        )}
      </div>

      <label className="mt-5 block border-t border-black/10 pt-4">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-[#14100F]/60">
          Other time (agreed with the client)
        </span>
        <input type="time" className={field} value={time} onChange={(e) => { setTime(e.target.value); setError(null) }} />
        <span className={`mt-1 block text-sm ${mutedClass}`}>
          We still check business hours, travel time and your other jobs.
        </span>
      </label>

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <button
        type="button"
        disabled={!time || reschedule.isPending}
        onClick={submit}
        className="w-full rounded-2xl bg-[#14100F] py-3.5 text-base font-bold text-white disabled:opacity-50"
      >
        {reschedule.isPending ? "Moving…" : time ? `Move to ${formatTime(time)}` : "Pick a time"}
      </button>
    </Sheet>
  )
}

// Client-side reasons only; the API refuses anything else. A tech who can't make
// it uses "Can't attend", and a client who isn't there is a no-show.
const CANCEL_REASONS = ["Client asked to cancel", "Duplicate or booked by mistake"]

// The tech calls off their own job before it starts. A reason is required
// because the client and the office both see it. Refunds are the office's call, so the sheet says so
// when the client has paid rather than promising one.
export function StaffCancelSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { toast } = useToast()
  const cancel = useStaffCancel()
  const [choice, setChoice] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const client = booking.customer_name ?? "The client"
  const paid = Number(booking.financials?.amount_paid ?? 0)
  const reason = [choice, note.trim()].filter(Boolean).join(": ")

  async function submit() {
    setError(null)
    try {
      await cancel.mutateAsync({ bookingId: booking.id, reason })
      toast({ title: "Job cancelled", description: `${client} and the office have been told.`, variant: "success" })
      onClose()
    } catch (e: unknown) {
      setError(apiError(e))
    }
  }

  return (
    <Sheet title="Cancel this job?" onClose={onClose}>
      <p className={`mb-2 text-sm ${mutedClass}`}>
        {booking.service.name}, {formatBookingDate(booking.starts_at)} at {formatBookingTime(booking.starts_at)}. It comes
        off your schedule and {client} and the office are told why.
        {paid > 0 ? ` ${client} has paid $${paid.toFixed(2)}; the office decides on any refund.` : ""}
      </p>
      <p className={`mb-4 rounded-xl bg-black/[0.04] px-3 py-2 text-sm ${mutedClass}`}>
        Just can&apos;t make it yourself? Use &quot;Can&apos;t attend&quot; instead, so {client} is offered a new time.
        To change the time, use Reschedule.
      </p>

      <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-[#14100F]/60">Why is it cancelled?</span>
      <div className="grid gap-2">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => { setChoice(r); setError(null) }}
            aria-pressed={choice === r}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold ${
              choice === r ? "border-[#14100F] bg-[#14100F] text-white" : "border-black/10 bg-white text-[#14100F]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {choice ? (
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-[#14100F]/60">
            Add a note (optional)
          </span>
          <textarea rows={2} className={field} value={note} onChange={(e) => { setNote(e.target.value); setError(null) }} />
        </label>
      ) : null}

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <button
        type="button"
        disabled={!reason || cancel.isPending}
        onClick={submit}
        className="w-full rounded-2xl bg-[#8f3f4b] py-3.5 text-base font-bold text-white disabled:opacity-50"
      >
        {cancel.isPending ? "Cancelling…" : "Cancel job"}
      </button>
      <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl bg-white py-3 text-base font-bold text-[#14100F]">
        Keep the job
      </button>
    </Sheet>
  )
}
