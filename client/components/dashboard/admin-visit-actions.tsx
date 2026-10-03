"use client"

import { useState } from "react"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminCancelVisit, useAdminRescheduleVisit } from "@/lib/hooks/use-admin"
import type { Booking } from "@/lib/hooks/use-bookings"
import { visitTitle } from "@/lib/visits"

const field =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none focus:border-[#c96c83]"

// Whole-visit controls for a booking that's one service of a multi-service
// visit: move every service together, or cancel all of them. Single services
// are still moved, reassigned or cancelled with the booking's own actions.
export function AdminVisitActions({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const reschedule = useAdminRescheduleVisit()
  const cancel = useAdminCancelVisit()
  const [mode, setMode] = useState<"move" | "cancel" | null>(null)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [keepTechs, setKeepTechs] = useState(true)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  if (booking.visit_id == null) return null
  const visitId = booking.visit_id

  function close() {
    setMode(null)
    setError(null)
    setReason("")
  }

  function onError(err: unknown) {
    const data = (err as { response?: { data?: { error?: string } } })?.response?.data
    setError(data?.error ?? "That didn't work. Please try again.")
  }

  function submitMove() {
    reschedule.mutate(
      { visitId, starts_at: `${date}T${time}:00`, keep_techs: keepTechs },
      { onSuccess: () => { toast({ title: "Visit moved", variant: "success" }); close() }, onError },
    )
  }

  function submitCancel() {
    cancel.mutate(
      { visitId, reason: reason.trim() || undefined },
      { onSuccess: () => { toast({ title: "Visit cancelled", variant: "success" }); close() }, onError },
    )
  }

  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setMode("move")}>Move whole visit</Button>
      <Button size="xs" variant="destructive" onClick={() => setMode("cancel")}>Cancel whole visit</Button>

      <Dialog open={mode != null} onOpenChange={(next) => { if (!next) close() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Visit #{visitId}</p>
            <DialogTitle>{mode === "move" ? "Move whole visit" : "Cancel whole visit"}</DialogTitle>
            <DialogDescription>
              {visitTitle(booking)}.{" "}
              {mode === "move"
                ? "Every service moves together, back-to-back from the new start. The customer and techs are told."
                : "Every service still due is cancelled. The customer is told once and each tech about their own job."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {error ? (
              <p aria-live="polite" className="mb-3 border border-[#b75c68]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">{error}</p>
            ) : null}
            {mode === "move" ? (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} aria-label="New date" />
                  <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} aria-label="New start time" />
                </div>
                <label className="flex items-start gap-2 text-sm font-semibold text-[#101217]">
                  <input type="checkbox" checked={keepTechs} onChange={(e) => setKeepTechs(e.target.checked)} className="mt-0.5 size-4 accent-[#c96c83]" />
                  <span>
                    Keep the same technicians
                    <span className="block text-xs font-medium text-[#5f6268]">Off: each service goes to whoever is free at the new time.</span>
                  </span>
                </label>
              </div>
            ) : (
              <textarea
                className="min-h-24 w-full border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none focus:border-[#c96c83]"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </DialogBody>
          <DialogFooter>
            {mode === "move" ? (
              <Button size="sm" disabled={!date || !time || reschedule.isPending} onClick={submitMove}
                style={{ background: "#c96c83", border: "none", color: "#fff" }}>
                {reschedule.isPending ? "Moving..." : "Move visit"}
              </Button>
            ) : (
              <Button size="sm" variant="destructive" disabled={cancel.isPending} onClick={submitCancel}>
                {cancel.isPending ? "Cancelling..." : "Cancel visit"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={close}>Back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
