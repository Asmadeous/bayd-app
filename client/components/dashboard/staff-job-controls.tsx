"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, MessageCircle, Phone } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useBookingAccess, windowNotStartedMessage } from "@/lib/booking-access"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useMarkMissed, useMarkNoShow, useStaffCancel } from "@/lib/hooks/use-employee"
import { useClockIn, useClockOut } from "@/lib/hooks/use-time-clock"

// Must match EmployeesController::STAFF_CANCEL_REASONS.
const CANCEL_REASONS = ["Client asked to cancel", "Duplicate or booked by mistake"]

function apiError(e: unknown, fallback = "Please try again.") {
  const data = (e as { response?: { data?: { error?: string } } })?.response?.data
  return data?.error ?? (e instanceof Error && e.message ? e.message : fallback)
}

// The staff app's job controls, for the staff web dashboard: same hooks and
// the same server rules (clock in from 30 min before, within 150 m; cancel
// before the start, no-show from it; "can't attend" tells the office).
export function StaffJobControls({ booking }: { booking: Booking }) {
  const preArrival = booking.status === "confirmed"
  const inProgress = booking.status === "in_progress"
  const open = booking.status === "pending" || booking.status === "confirmed"

  if (!preArrival && !inProgress && !open) return null

  return (
    <div className="w-full space-y-2">
      {inProgress && booking.clocked_in_at ? <RunningTimer since={booking.clocked_in_at} /> : null}
      {preArrival || inProgress ? <ClockControl booking={booking} /> : null}
      <div className="flex flex-wrap gap-2">
        {booking.client_phone ? (
          <a
            href={`tel:${booking.client_phone}`}
            className="inline-flex h-7 items-center gap-1 border border-black/15 px-2.5 text-xs font-semibold text-[#101217] hover:bg-black/[0.03]"
          >
            <Phone className="size-3.5 text-[#c96c83]" /> {booking.client_phone}
          </a>
        ) : null}
        <MessageClientButton bookingId={booking.id} />
        {open ? <RescheduleDialog booking={booking} staff /> : null}
        {open ? <ChangeJob booking={booking} /> : null}
      </div>
    </div>
  )
}

function ClockControl({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const access = useBookingAccess(booking)
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const inProgress = booking.status === "in_progress"
  const busy = clockIn.isPending || clockOut.isPending

  if (!inProgress && !access.open) {
    return (
      <button
        type="button"
        onClick={() =>
          toast({ title: "Not open yet", description: windowNotStartedMessage(access.opensLabel, "clock in"), variant: "error" })
        }
        className="flex w-full items-center justify-center gap-2 bg-[#4E9A57]/15 py-2.5 text-sm font-bold text-[#2F6B37]"
      >
        <Lock aria-hidden className="size-4" /> Clock in · opens {access.opensLabel}
      </button>
    )
  }

  const mutation = inProgress ? clockOut : clockIn
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        mutation.mutate(booking.id, {
          onSuccess: () => toast({ title: inProgress ? "Clocked out" : "Clocked in", variant: "success" }),
          onError: (e) =>
            toast({ title: inProgress ? "Couldn't clock out" : "Couldn't clock in", description: apiError(e), variant: "error" }),
        })
      }
      className={`w-full py-2.5 text-sm font-bold text-white disabled:opacity-60 ${inProgress ? "bg-[#101217]" : "bg-[#4E9A57]"}`}
    >
      {busy ? "Getting your location..." : inProgress ? "Clock out" : "Clock in"}
    </button>
  )
}

// HH:MM:SS since clock-in.
function RunningTimer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0")
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
  const ss = String(secs % 60).padStart(2, "0")
  return (
    <p className="text-center text-sm font-bold text-[#2F6B37]">
      In service · {hh}:{mm}:{ss}
    </p>
  )
}

// The list rows don't carry the client's user id (only the single-job view
// does), so look the job up on click, then open or reuse the chat.
function MessageClientButton({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  async function open() {
    setBusy(true)
    try {
      const { data: job } = await api.get<{ client?: { user_id: number } | null }>(`/employee/bookings/${bookingId}`)
      if (!job.client?.user_id) throw new Error("This booking has no client account to message.")
      const { data: convo } = await api.post<{ id: number }>("/conversations", { user_id: job.client.user_id })
      router.push(`/dashboard/employee/messages?c=${convo.id}`)
    } catch (e) {
      toast({ title: "Couldn't open the chat", description: apiError(e), variant: "error" })
      setBusy(false)
    }
  }

  return (
    <Button size="xs" variant="outline" disabled={busy} onClick={open}>
      <MessageCircle className="mr-1 size-3.5" /> Message client
    </Button>
  )
}

// Cancel (before the start, with a reason) or No-show (from the start), plus
// "Can't attend" for the tech's own absence, as in the staff app.
function ChangeJob({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const cancel = useStaffCancel()
  const noShow = useMarkNoShow()
  const missed = useMarkMissed()
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [now] = useState(() => Date.now())
  const started = now >= new Date(booking.starts_at).getTime()

  const done = (title: string) => ({
    onSuccess: () => toast({ title, variant: "success" }),
    onError: (e: unknown) => toast({ title: "Not updated", description: apiError(e), variant: "error" }),
  })

  return (
    <>
      {started ? (
        <Confirm
          trigger="No-show"
          title="Client wasn't there?"
          body="The booking is marked a no-show and the unpaid balance is charged to the client's card on file."
          confirmLabel="Mark no-show"
          disabled={noShow.isPending}
          onConfirm={() => noShow.mutate(booking.id, done("Marked as no-show"))}
        />
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="xs" variant="outline" disabled={cancel.isPending}>
              Cancel job
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
              <AlertDialogDescription>
                The client and the office are told. If you can&apos;t make it yourself, use &ldquo;Can&apos;t attend&rdquo; instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-[#101217]">
                  <input type="radio" name={`cancel-${booking.id}`} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep job</AlertDialogCancel>
              <AlertDialogAction onClick={() => cancel.mutate({ bookingId: booking.id, reason }, done("Job cancelled"))}>
                Cancel job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Confirm
        trigger="Can't attend"
        danger
        title="Can't attend this job?"
        body="The client is offered a new time and the office is told, so they can cover it. No charge is applied. This can't be undone."
        confirmLabel="Yes, I can't attend"
        disabled={missed.isPending}
        onConfirm={() => missed.mutate(booking.id, done("The office has been told"))}
      />
    </>
  )
}

function Confirm({
  trigger,
  title,
  body,
  confirmLabel,
  onConfirm,
  disabled,
  danger = false,
}: {
  trigger: string
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="xs" variant={danger ? "destructive" : "outline"} disabled={disabled}>
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
