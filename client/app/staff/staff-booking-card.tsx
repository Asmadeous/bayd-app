"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, CalendarDays, Check, Clock3, Lock, MapPin, CreditCard, MessageCircle, Navigation, Video, X } from "lucide-react"

import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useBookingAccess, windowNotStartedMessage } from "@/lib/booking-access"
import { useStartMeeting } from "@/lib/hooks/use-meetings"
import { useClockIn, useClockOut } from "@/lib/hooks/use-time-clock"
import { useChargeBooking, useMarkMissed, useMarkNoShow, useRecordPayment } from "@/lib/hooks/use-employee"
import { CHARGE_METHODS, paymentMethodLabel, type OfflinePaymentMethod } from "@/lib/payment-methods"
import { openPaymentUrl } from "@/lib/native/open-external"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { useRouter } from "next/navigation"
import { apiError, StaffCancelSheet, StaffRescheduleSheet } from "./schedule/job-edit-sheets"
import { cardClass, bookingStatusStyle, mutedClass, staffTheme } from "./staff-theme"

// A technician's booking as a purpose-built mobile card. Carries every action the
// desktop StaffBookingActions had: join the work-scope call, navigate to the
// customer, and add an overtime charge - plus the booking summary.
// The card is STATE-DRIVEN by where the job is in its lifecycle:
//   confirmed  -> pre-arrival: Navigate + Join call + CLOCK IN (charging is
//                 gated - a tech can't charge before they've started the job)
//   in_progress-> a live service TIMER + CLOCK OUT (no charge yet)
//   completed  -> the CHARGE page (overtime/settle) appears so they can bill
// `history` (the Past tab): a read-only record. A job whose time is over can still
// read "confirmed" if nobody clocked in, and must not offer clock in / navigate.
export function StaffBookingCard({ booking, history = false }: { booking: Booking; history?: boolean }) {
  return (
    <li className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.08em] ${bookingStatusStyle(
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
          {booking.client_type === "group" && booking.party_size > 1 ? ` · party of ${booking.party_size}` : ""}
        </p>
      </div>

      {/* Client details the tech needs to run the visit: who, where, how to reach
          them, and any special requests. */}
      <ClientDetails booking={booking} />

      {/* Add-ons: extra services the same tech does this visit (note-only). */}
      {booking.addons?.length > 0 && (
        <div className="mt-2 rounded-lg bg-[#C96C83]/8 px-3 py-2">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-[#C96C83]">Add-ons</p>
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

      <JobActions booking={booking} history={history} />
    </li>
  )
}

// The job's buttons, in order of weight: Clock in (locked with its opening time
// until 30 minutes before; the API refuses earlier) or Clock out, then Navigate
// and the video call, then "Can't attend"; Charge once it's done. `history`
// (time passed with no clock-in) shows a note instead of actions.
const SECONDARY_COLS = ["hidden", "grid-cols-1", "grid-cols-2", "grid-cols-3"]

export function JobActions({
  booking,
  history = false,
  showFinancials = true,
  clientUserId,
}: {
  booking: Booking
  history?: boolean
  // The Job screen has its own Payment section.
  showFinancials?: boolean
  // Lets the tech open a chat with the client (the Job screen has it).
  clientUserId?: number
}) {
  const router = useRouter()
  const [now] = useState(() => Date.now())
  const canNavigate = !!booking.service_latitude && !!booking.service_longitude
  const inProgress = !history && booking.status === "in_progress"
  const done = !history && booking.status === "completed"
  const preArrival = !history && booking.status === "confirmed"
  const started = now >= new Date(booking.starts_at).getTime()
  const isPast = ["completed", "cancelled", "no_show", "missed"].includes(booking.status)
  const access = useBookingAccess(booking)
  const secondaryCount =
    (canNavigate && access.open ? 1 : 0) + (clientUserId && access.open ? 1 : 0) + (preArrival ? 1 : 0)

  return (
    <>
      {/* In service -> live timer */}
      {inProgress && booking.clocked_in_at && <RunningTimer since={booking.clocked_in_at} />}

      {/* One main action per card: Clock in (shown locked, with its opening
          time, until 30 minutes before the start; the API refuses earlier), or
          Clock out while in service. Navigate and the video call sit under it as
          secondary buttons, then "Can't attend" in red. */}
      {preArrival && !access.open && <LockedWindow opensLabel={access.opensLabel} />}
      {((preArrival && access.open) || inProgress) && <ClockButton booking={booking} />}

      {/* Secondary: in-app navigation and messaging the client (both from 30
          minutes before, and still while in service), and the video call. */}
      {(preArrival || inProgress) && (
        <div className={`mt-2 grid gap-2 ${SECONDARY_COLS[secondaryCount]}`}>
          {canNavigate && access.open && (
            <button
              type="button"
              onClick={() => router.push(`/staff/schedule/navigate?id=${booking.id}`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C96C83]/10 px-3 py-2.5 text-sm font-bold text-[#9E4A60] transition-colors active:bg-[#C96C83]/20"
            >
              <Navigation className="size-4 text-[#C96C83]" aria-hidden /> Navigate
            </button>
          )}
          {clientUserId && access.open ? <MessageClientButton clientUserId={clientUserId} /> : null}
          {preArrival ? <JoinCallButton booking={booking} /> : null}
        </div>
      )}

      {/* Reschedule, with Cancel beside it before the start time (client asked,
          or booked by mistake) and No-show from the start time (client not
          there, charged). "Can't attend" below is the tech's own absence. */}
      {!history && ["pending", "confirmed"].includes(booking.status) && (
        <ChangeJobButtons booking={booking} started={started} />
      )}

      {/* Pre-arrival only: self-report that you can't attend (missed). The client
          is never charged; they're notified and offered a reschedule. */}
      {preArrival && <MarkMissedButton booking={booking} />}

      {/* Clocked in but the client isn't there: charges the unpaid balance. */}
      {inProgress && started ? <MarkNoShowButton booking={booking} /> : null}

      {history && ["confirmed", "pending", "in_progress"].includes(booking.status) ? (
        <p className="mt-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-[#14100F]/60">
          {booking.status === "in_progress" ? "Never clocked out." : "No clock-in was recorded for this appointment."}
        </p>
      ) : null}

      {/* Past bookings (history): show the money summary, not action buttons. */}
      {isPast && showFinancials && <PastFinancials booking={booking} />}

      {/* A just-completed job (in the active list) can still be charged. */}
      {done && <ChargeButton booking={booking} />}
    </>
  )
}

// Everything the technician needs to run the visit: client name, the full
// service address (with apartment / buzz code so they can get in), a tappable
// phone to call ahead, and any notes / special requests the client left.
function ClientDetails({ booking }: { booking: Booking }) {
  const addr = booking.address
  const name = booking.customer_name
  const phone = booking.booked_for_phone
  const notes = booking.notes?.trim()

  const addressLine = addr
    ? [addr.line1, addr.line2, addr.city, addr.province, addr.postal_code].filter(Boolean).join(", ")
    : null

  if (!name && !addressLine && !phone && !notes) return null

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm">
      {name && (
        <div className="flex items-start gap-2">
          <span className="text-[#14100F]/45">Client</span>
          <span className="ml-auto text-right font-semibold text-[#14100F]">{name}</span>
        </div>
      )}

      {addressLine && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2"
        >
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#C96C83]" aria-hidden />
          <span className="text-[#14100F]">
            {addressLine}
            {addr?.is_apartment && addr?.buzz_code ? ` · Buzz ${addr.buzz_code}` : ""}
          </span>
        </a>
      )}

      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 font-semibold text-[#C96C83]">
          <span className="text-[#14100F]/45">Call</span>
          <span className="ml-auto text-right">{phone}</span>
        </a>
      )}

      {notes && (
        <div className="rounded-lg bg-[#C98A2E]/10 px-2.5 py-1.5 text-[#8a5e12]">
          <span className="text-[0.8125rem] font-bold uppercase tracking-[0.08em]">Notes</span>
          <p className="mt-0.5 leading-snug">{notes}</p>
        </div>
      )}
    </div>
  )
}

// Financial summary for a past booking, rendered per account type: a direct tech
// sees charged + their tips; a partner provider sees charged + their share +
// payout status. Fuel reimbursement is intentionally NOT shown - it's admin comp
// data, not something the tech is meant to see. Read-only history.
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
        ]
  if (booking.paid_methods?.length) {
    rows.push({ label: "Paid by", value: booking.paid_methods.map(paymentMethodLabel).join(" + ") })
  }

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
        <p className="mt-2 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-[#14100F]/40">
          Partner payout: {f.payout_status === "settled" ? "paid out" : "owed"}
        </p>
      )}
    </div>
  )
}

// Settle the booking's outstanding balance. The tech picks how the client is
// paying: Card opens Square's card form in the in-app browser, where the tech
// enters the card the client hands them (it is never sent to the client); the
// webhook marks it paid, and we refresh when the browser closes. Cash, Interac e-Transfer,
// and cheque are collected in person, so confirming marks it paid with that
// method. Once settled, the card shows how it was paid instead.
// Taking payment once the job is done, in one flow: tap Charge, say whether the
// service ran over (overtime is added to the bill), then pick how the client
// pays. Card opens the card form on the tech's device; cash, e-Transfer and
// cheque are recorded as paid.
function ChargeButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const charge = useChargeBooking()
  const record = useRecordPayment()
  const [step, setStep] = useState<"closed" | "overtime" | "amount" | "method">("closed")
  const [overtime, setOvertime] = useState("")
  const due = Number(booking.outstanding_balance)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["employee-schedule"] })
    qc.invalidateQueries({ queryKey: ["employee-booking"] })
  }

  const addOvertime = useMutation({
    mutationFn: (amount: number) =>
      api.post(`/employee/bookings/${booking.id}/overtime`, { amount, collect: false }).then((r) => r.data),
    onSuccess: () => {
      refresh()
      setOvertime("")
      setStep("method")
    },
    onError: (e: unknown) => toast({ title: "Couldn't add the overtime", description: apiError(e), variant: "error" }),
  })
  const busy = charge.isPending || record.isPending || addOvertime.isPending

  async function chargeCard() {
    try {
      const { url } = await charge.mutateAsync(booking.id)
      void openPaymentUrl(url, refresh)
      setStep("closed")
    } catch (e: unknown) {
      toast({ title: "Couldn't start the checkout", description: apiError(e), variant: "error" })
    }
  }

  async function recordOffline(method: OfflinePaymentMethod) {
    const label = paymentMethodLabel(method)
    const ok = await confirm({
      title: `Paid by ${label}?`,
      message: `Only confirm once you have the $${due.toFixed(2)}. The booking will be marked paid by ${label}.`,
      confirmLabel: `Mark paid · ${label}`,
      cancelLabel: "Back",
    })
    if (!ok) return
    try {
      await record.mutateAsync({ bookingId: booking.id, method })
      setStep("closed")
      toast({ title: "Marked paid", description: `$${due.toFixed(2)} by ${label}.`, variant: "success" })
    } catch (e: unknown) {
      toast({ title: "Couldn't mark paid", description: apiError(e), variant: "error" })
    }
  }

  function submitOvertime() {
    const amount = Number(overtime)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter the overtime amount", description: "It must be more than $0.", variant: "error" })
      return
    }
    addOvertime.mutate(amount)
  }

  // Paid in full: say so, and still allow overtime found afterwards.
  if (due <= 0 && step === "closed") {
    if (!booking.paid_methods?.length) return null
    return (
      <div className="mt-3">
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-[#4E9A57]/10 py-2.5 text-sm font-bold text-[#3f7e47]">
          <Check className="size-4" aria-hidden />
          Paid · {booking.paid_methods.map(paymentMethodLabel).join(" + ")}
        </p>
        <button
          type="button"
          onClick={() => setStep("amount")}
          className="mt-2 w-full rounded-lg bg-black/[0.05] py-2.5 text-sm font-bold text-[#14100F]"
        >
          Add overtime
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3">
      {step === "closed" ? (
        <button
          type="button"
          onClick={() => setStep("overtime")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14100F] py-3 text-sm font-bold text-white"
        >
          <CreditCard className="size-4" aria-hidden />
          Charge · ${due.toFixed(2)}
        </button>
      ) : (
        <div className="rounded-xl bg-black/[0.04] p-3">
          {step === "overtime" ? (
            <>
              <p className="text-sm font-bold">Did the service run over time?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="rounded-lg bg-white py-2.5 text-sm font-bold text-[#14100F]"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setStep("amount")}
                  className="rounded-lg bg-[#C96C83]/15 py-2.5 text-sm font-bold text-[#9E4A60]"
                >
                  Yes, add overtime
                </button>
              </div>
            </>
          ) : step === "amount" ? (
            <>
              <label className="text-sm font-bold" htmlFor={`overtime-${booking.id}`}>Overtime amount</label>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8a8d93]">$</span>
                  <input
                    id={`overtime-${booking.id}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={overtime}
                    onChange={(e) => setOvertime(e.target.value)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-white pl-7 pr-3 text-base text-[#14100F] outline-none focus:border-[#C96C83]"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitOvertime}
                  disabled={busy || !overtime}
                  className="h-11 shrink-0 rounded-xl bg-[#14100F] px-4 text-sm font-bold text-white disabled:opacity-40"
                >
                  {addOvertime.isPending ? "Adding…" : "Add"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">How is the client paying ${due.toFixed(2)}?</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Payment method">
                {CHARGE_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    disabled={busy}
                    onClick={() => (m.value === "card" ? chargeCard() : recordOffline(m.value))}
                    className="rounded-lg bg-white px-3 py-2.5 text-left transition-colors active:bg-black/5 disabled:opacity-50"
                  >
                    <span className="block text-sm font-bold text-[#14100F]">{m.label}</span>
                    <span className="block text-[0.8125rem] leading-tight text-[#14100F]/55">{m.hint}</span>
                  </button>
                ))}
              </div>
              {charge.isPending ? <p className="mt-2 text-center text-sm text-[#14100F]/55">Opening the card form…</p> : null}
            </>
          )}
          <button
            type="button"
            onClick={() => setStep("closed")}
            className="mt-2 w-full py-1.5 text-center text-sm font-semibold text-[#14100F]/55"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// Clock-in and navigation are locked until 30 minutes before the start; tapping
// explains why (the API refuses an early clock-in with the same message).
function LockedWindow({ opensLabel }: { opensLabel: string }) {
  const { toast } = useToast()
  return (
    <button
      type="button"
      onClick={() =>
        toast({ title: "Not open yet", description: windowNotStartedMessage(opensLabel, "clock in and navigate"), variant: "error" })
      }
      aria-label={`Clock in, opens ${opensLabel}`}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4E9A57]/15 py-3 text-sm font-bold text-[#2F6B37]"
    >
      <Lock className="size-4" aria-hidden />
      Clock in · opens {opensLabel}
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
function ChangeJobButtons({ booking, started }: { booking: Booking; started: boolean }) {
  const [sheet, setSheet] = useState<"reschedule" | "cancel" | null>(null)

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSheet("reschedule")}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black/[0.05] px-3 py-2.5 text-sm font-bold text-[#14100F] transition-colors active:bg-black/10"
        >
          <CalendarClock className="size-4" aria-hidden /> Reschedule
        </button>
        {started ? (
          <MarkNoShowButton booking={booking} inRow />
        ) : (
          <button
            type="button"
            onClick={() => setSheet("cancel")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black/[0.05] px-3 py-2.5 text-sm font-bold text-[#8f3f4b] transition-colors active:bg-black/10"
          >
            <X className="size-4" aria-hidden /> Cancel job
          </button>
        )}
      </div>
      {sheet === "reschedule" && <StaffRescheduleSheet booking={booking} onClose={() => setSheet(null)} />}
      {sheet === "cancel" && <StaffCancelSheet booking={booking} onClose={() => setSheet(null)} />}
    </>
  )
}

function MarkMissedButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const markMissed = useMarkMissed()

  async function go() {
    // Customer-visible + irreversible -> real modal confirmation.
    const ok = await confirm({
      title: "Can't attend this job?",
      message: "The client is offered a new time and the office is told, so they can cover it. No charge is applied. This can't be undone.",
      confirmLabel: "Yes, I can't attend",
      cancelLabel: "Back",
      tone: "danger",
    })
    if (!ok) return
    try {
      await markMissed.mutateAsync(booking.id)
      toast({
        title: "Marked as missed",
        description: "The client was offered a new time and the office was told. No charge was applied.",
        variant: "success",
      })
    } catch (e: unknown) {
      const d = e as { response?: { data?: { error?: string } }; message?: string }
      toast({
        title: "Couldn't mark missed",
        description: d?.response?.data?.error ?? d?.message ?? "Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={markMissed.isPending}
      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#8f3f4b]/10 px-3 py-2.5 text-sm font-bold text-[#8f3f4b] transition-colors active:bg-[#8f3f4b]/20 disabled:opacity-50"
    >
      {markMissed.isPending ? "…" : "Can't attend"}
    </button>
  )
}

// `inRow` is the half-width button beside Reschedule.
function MarkNoShowButton({ booking, inRow = false }: { booking: Booking; inRow?: boolean }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const markNoShow = useMarkNoShow()

  async function go() {
    const client = booking.customer_name ?? "the client"
    const owed = Number(booking.outstanding_balance)
    const charge =
      owed > 0
        ? `The $${owed.toFixed(2)} still owed for the booking is charged to their card on file (the office follows up if it can't be).`
        : "The booking is already paid, so nothing more is charged."
    const ok = await confirm({
      title: "Client didn't show?",
      message: `Mark ${client} as a no-show. ${charge} They're told they missed it. This can't be undone.`,
      confirmLabel: "Mark no-show",
      cancelLabel: "Back",
      tone: "danger",
    })
    if (!ok) return
    try {
      await markNoShow.mutateAsync(booking.id)
      toast({ title: "Marked as a no-show", variant: "success" })
    } catch (e: unknown) {
      toast({ title: "Couldn't mark the no-show", description: apiError(e), variant: "error" })
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={markNoShow.isPending}
      className={`${inRow ? "" : "mt-2 w-full "}inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#8f3f4b]/10 px-3 py-2.5 text-sm font-bold text-[#8f3f4b] transition-colors active:bg-[#8f3f4b]/20 disabled:opacity-50`}
    >
      {markNoShow.isPending ? "…" : inRow ? "No-show" : "Client didn't show"}
    </button>
  )
}

// Opens (or reuses) the chat with the client. The API refuses before the 30-minute
// window, same as the customer side.
function MessageClientButton({ clientUserId }: { clientUserId: number }) {
  const router = useRouter()
  const { toast } = useToast()
  const [opening, setOpening] = useState(false)

  async function open() {
    setOpening(true)
    try {
      const { data } = await api.post<{ id: number }>("/conversations", { user_id: clientUserId })
      router.push(`/staff/messages/thread?id=${data.id}`)
    } catch (e: unknown) {
      toast({ title: "Couldn't open the chat", description: apiError(e), variant: "error" })
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={opening}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C96C83]/10 px-3 py-2.5 text-sm font-bold text-[#9E4A60] transition-colors active:bg-[#C96C83]/20 disabled:opacity-50"
    >
      <MessageCircle className="size-4 text-[#C96C83]" aria-hidden /> {opening ? "Opening…" : "Message"}
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
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#C96C83]/10 px-3 py-2.5 text-sm font-bold text-[#9E4A60] transition-colors active:bg-[#C96C83]/20 disabled:opacity-50"
    >
      <Video className="size-4 text-[#C96C83]" aria-hidden />
      {startMeeting.isPending ? "…" : scheduled ? "Join call" : "Start call"}
    </button>
  )
}

