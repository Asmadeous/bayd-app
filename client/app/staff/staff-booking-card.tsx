"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Clock3, MapPin, CreditCard, Navigation, Video } from "lucide-react"

import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useStartMeeting } from "@/lib/hooks/use-meetings"
import { useClockIn, useClockOut } from "@/lib/hooks/use-time-clock"
import { useChargeBooking, useMarkMissed } from "@/lib/hooks/use-employee"
import { openPaymentUrl } from "@/lib/native/open-external"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useRouter } from "next/navigation"
import { cardClass, bookingStatusStyle, mutedClass, staffTheme } from "./staff-theme"

// A technician's booking as a purpose-built mobile card. Carries every action the
// desktop StaffBookingActions had: join the work-scope call, navigate to the
// customer, and add an overtime charge - plus the booking summary.
// The card is STATE-DRIVEN by where the job is in its lifecycle:
//   confirmed  -> pre-arrival: Navigate + Join call + CLOCK IN (charging is
//                 gated - a tech can't charge before they've started the job)
//   in_progress-> a live service TIMER + CLOCK OUT (no charge yet)
//   completed  -> the CHARGE page (overtime/settle) appears so they can bill
export function StaffBookingCard({ booking }: { booking: Booking }) {
  const router = useRouter()
  const canNavigate = !!booking.service_latitude && !!booking.service_longitude
  const inProgress = booking.status === "in_progress"
  const done = booking.status === "completed"
  const preArrival = booking.status === "confirmed"
  const isPast = ["completed", "cancelled", "no_show", "missed"].includes(booking.status)

  return (
    <li className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${bookingStatusStyle(
            booking.status,
          )}`}
        >
          {booking.status.replace("_", " ")}
        </span>
        <span className="text-sm font-extrabold">${Number(booking.total).toFixed(2)}</span>
      </div>

      <p className="mt-3 text-lg font-extrabold leading-tight">{booking.service?.name}</p>

      <div className={`mt-2 space-y-1 text-sm ${mutedClass}`}>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#C96C83]" aria-hidden />
          {formatBookingDate(booking.starts_at)} · {formatBookingTime(booking.starts_at)}
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 text-[#C96C83]" aria-hidden />
          {booking.service?.duration_minutes} min
        </p>
      </div>

      {/* Add-ons: extra services the same tech does this visit (note-only). */}
      {booking.addons?.length > 0 && (
        <div className="mt-2 rounded-lg bg-[#C96C83]/8 px-3 py-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#C96C83]">Add-ons</p>
          <ul className="mt-1 space-y-0.5">
            {booking.addons.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-[#14100F]">{a.name}</span>
                <span className="shrink-0 font-semibold text-[#14100F]">${Number(a.price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* In service -> live timer */}
      {inProgress && booking.clocked_in_at && <RunningTimer since={booking.clocked_in_at} />}

      {/* Pre-arrival actions: navigate + call as equal-width halves, then clock in. */}
      {preArrival && (
        <div className={`mt-3 grid gap-2 ${canNavigate ? "grid-cols-2" : "grid-cols-1"}`}>
          <JoinCallButton booking={booking} />
          {canNavigate && (
            <button
              type="button"
              onClick={() => router.push(`/staff/schedule/navigate?id=${booking.id}`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-[#14100F]"
            >
              <Navigation className="size-4 text-[#C96C83]" aria-hidden /> Navigate
            </button>
          )}
        </div>
      )}

      {/* Clock in (pre-arrival) or Clock out (in service) - the primary action. */}
      {(preArrival || inProgress) && <ClockButton booking={booking} />}

      {/* Pre-arrival only: self-report that you can't attend (missed). The client
          is never charged; they're notified and offered a reschedule. */}
      {preArrival && <MarkMissedButton booking={booking} />}

      {/* Past bookings (history): show the money summary, not action buttons. */}
      {isPast && <PastFinancials booking={booking} />}

      {/* A just-completed job (in the active list) can still be charged. */}
      {done && (
        <>
          <ChargeCardButton booking={booking} />
          <OvertimeCharge bookingId={booking.id} />
        </>
      )}
    </li>
  )
}

// Financial summary for a past booking, rendered per account type: a direct tech
// sees charged/tips/fuel; a partner provider sees charged + their share + payout
// status (no fuel — partners aren't reimbursed). Read-only history.
function PastFinancials({ booking }: { booking: Booking }) {
  const f = booking.financials
  if (!f) return null
  const money = (v: string) => `$${Number(v).toFixed(2)}`
  const rows: { label: string; value: string }[] =
    f.account_type === "partner"
      ? [
          { label: "Charged", value: money(f.amount_paid) },
          { label: "Your share", value: money(f.provider_share) },
        ]
      : [
          { label: "Charged", value: money(f.amount_paid) },
          { label: "Tips", value: money(f.tips) },
          { label: "Fuel", value: money(f.fuel_reimbursement) },
        ]

  return (
    <div className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2.5">
      <dl className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <dt className="text-[#14100F]/55">{r.label}</dt>
            <dd className="font-semibold text-[#14100F]">{r.value}</dd>
          </div>
        ))}
      </dl>
      {f.account_type === "partner" && (
        <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#14100F]/40">
          Partner payout: {f.payout_status === "settled" ? "paid out" : "owed"}
        </p>
      )}
    </div>
  )
}

// In-person card checkout for the booking's outstanding balance. Opens the same
// hosted checkout the customer app uses (Square), where the tech enters the
// CLIENT'S card - the payment/invoice stays the customer's, staff just runs the
// terminal. The backend marks it paid by webhook; on returning from the checkout
// we refresh the schedule so the paid state shows.
function ChargeCardButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const charge = useChargeBooking()
  const due = Number(booking.outstanding_balance)

  if (due <= 0) return null

  async function chargeCard() {
    try {
      const { url } = await charge.mutateAsync(booking.id)
      // Open the hosted checkout; on return, refresh so the webhook-confirmed
      // paid state is reflected.
      void openPaymentUrl(url, () => qc.invalidateQueries({ queryKey: ["employee-schedule"] }))
    } catch (e: unknown) {
      const d = e as { response?: { data?: { error?: string } }; message?: string }
      toast({
        title: "Couldn't start the checkout",
        description: d?.response?.data?.error ?? d?.message ?? "Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <button
      type="button"
      onClick={chargeCard}
      disabled={charge.isPending}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14100F] py-3 text-sm font-bold text-white disabled:opacity-50"
    >
      <CreditCard className="size-4" aria-hidden />
      {charge.isPending ? "Opening checkout…" : `Charge card · $${due.toFixed(2)}`}
    </button>
  )
}

// Live timer while clocked in on a job (HH:MM:SS since clock-in).
function RunningTimer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const hhmmss = `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return (
    <div
      className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: `${staffTheme.live}14`, color: "#3f7e47" }}
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4E9A57] opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-[#4E9A57]" />
      </span>
      <span className="text-sm font-bold">In service</span>
      <span className="ml-auto font-mono text-base font-black tabular-nums">{hhmmss}</span>
    </div>
  )
}

// Clock in (confirmed) or clock out (in progress). GPS geofence is enforced by
// the backend; a "too far from client" error surfaces as a toast.
function ClockButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const isIn = booking.status === "in_progress"
  const busy = clockIn.isPending || clockOut.isPending

  async function go() {
    const mut = isIn ? clockOut : clockIn
    try {
      await mut.mutateAsync(booking.id)
      toast({
        title: isIn ? "Clocked out" : "Clocked in",
        description: isIn ? "Job complete - you can charge the client now." : "Service timer started.",
        variant: "success",
      })
    } catch (e: unknown) {
      const d = (e as { response?: { data?: { error?: string } }; message?: string })
      toast({
        title: isIn ? "Couldn't clock out" : "Couldn't clock in",
        description: d?.response?.data?.error ?? d?.message ?? "Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
      style={{ background: isIn ? "#14100F" : staffTheme.live }}
    >
      <MapPin className="size-4" aria-hidden />
      {busy ? "Locating…" : isIn ? "Clock out" : "Clock in"}
    </button>
  )
}

// Self-report a booking the tech can't attend (missed). Two-tap confirm because
// it's customer-visible and not something to fire by accident: the client gets a
// "we missed your appointment" notification and a reschedule prompt. Never charges.
function MarkMissedButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const markMissed = useMarkMissed()
  const [confirming, setConfirming] = useState(false)

  async function go() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    try {
      await markMissed.mutateAsync(booking.id)
      toast({
        title: "Marked as missed",
        description: "The client was notified and offered a reschedule. No charge was applied.",
        variant: "success",
      })
    } catch (e: unknown) {
      const d = e as { response?: { data?: { error?: string } }; message?: string }
      toast({
        title: "Couldn't mark missed",
        description: d?.response?.data?.error ?? d?.message ?? "Please try again.",
        variant: "error",
      })
      setConfirming(false)
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={markMissed.isPending}
      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-[#8f3f4b] disabled:opacity-50"
    >
      {markMissed.isPending ? "…" : confirming ? "Tap again to confirm you can't attend" : "Can't attend"}
    </button>
  )
}

// Start (idempotent) or join the work-scope call, opening the in-app call screen.
function JoinCallButton({ booking }: { booking: Booking }) {
  const router = useRouter()
  const startMeeting = useStartMeeting()
  const scheduled = booking.meeting?.status === "scheduled"

  async function go() {
    if (scheduled) {
      router.push(`/staff/schedule/call?id=${booking.id}`)
      return
    }
    try {
      await startMeeting.mutateAsync(booking.id)
      router.push(`/staff/schedule/call?id=${booking.id}`)
    } catch {
      /* surfaced by isError elsewhere */
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={startMeeting.isPending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#C96C83] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
    >
      <Video className="size-4" aria-hidden />
      {startMeeting.isPending ? "…" : scheduled ? "Join call" : "Start call"}
    </button>
  )
}

// Overtime charge - service ran over the allocated time. Posts to the same
// employee endpoint; a link result means a payment link was sent to the customer.
function OvertimeCharge({ bookingId }: { bookingId: number }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState("")
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const overtime = useMutation({
    mutationFn: () =>
      api
        .post<{ mode: string; url?: string }>(`/employee/bookings/${bookingId}/overtime`, {
          amount: Number(amount),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      setAmount("")
      qc.invalidateQueries({ queryKey: ["employee-schedule"] })
      setMsg({
        type: "success",
        text: data.mode === "link" ? "Charge added - link sent to the customer." : "Overtime charged.",
      })
    },
    onError: (error: unknown) => {
      const d = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
      setMsg({ type: "error", text: d?.error ?? d?.errors?.join(", ") ?? "Could not add the charge." })
    },
  })

  function submit() {
    const v = Number(amount)
    if (!Number.isFinite(v) || v <= 0) {
      setMsg({ type: "error", text: "Enter an amount greater than 0." })
      return
    }
    overtime.mutate()
  }

  return (
    <div className="mt-3 border-t border-black/[0.06] pt-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8a8d93]">
            $
          </span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="Overtime amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 w-full rounded-xl border border-black/10 bg-white pl-7 pr-3 text-base text-[#14100F] outline-none focus:border-[#C96C83]"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={overtime.isPending || !amount}
          className="h-11 shrink-0 rounded-xl bg-[#14100F] px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {overtime.isPending ? "…" : "Charge"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-xs font-medium ${msg.type === "success" ? "text-[#3f7e47]" : "text-[#b3453f]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
