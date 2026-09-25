"use client"

import { useState } from "react"

import { useToast } from "@/components/bayd-toast-provider"
import { ReassignControl } from "@/components/dashboard/reassign-control"
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUpdateBooking } from "@/lib/hooks/use-admin"
import type { Booking } from "@/lib/hooks/use-bookings"

// Everything an admin can do to one booking: reassign, reschedule, start,
// complete, and cancel with a recorded reason. Used on the bookings list and in
// the calendar's detail sheet. There is no delete: bookings are only cancelled.
export function AdminBookingActions({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const update = useUpdateBooking()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [cancelError, setCancelError] = useState<string | null>(null)
  const open = booking.status === "pending" || booking.status === "confirmed"

  function setStatus(status: Booking["status"], cancellation_reason?: string) {
    update.mutate(
      { id: booking.id, status, cancellation_reason },
      {
        onSuccess: () => {
          toast({ title: "Booking updated", description: `Booking marked ${status.replace("_", " ")}.`, variant: "success" })
          if (status === "cancelled") closeCancel()
        },
        onError: (error: unknown) => {
          const message = apiError(error, "Could not update this booking.")
          if (status === "cancelled") setCancelError(message)
          toast({ title: "Booking not updated", description: message, variant: "error" })
        },
      },
    )
  }

  function closeCancel() {
    setCancelOpen(false)
    setReason("")
    setCancelError(null)
  }

  return (
    <>
      {(open || booking.status === "in_progress") && <ReassignControl bookingId={booking.id} />}
      {open && <RescheduleDialog booking={booking} admin />}
      {booking.status === "confirmed" && (
        <Button
          disabled={update.isPending}
          onClick={() => setStatus("in_progress")}
          size="xs"
          className="border-none bg-[#d4a843] text-white hover:bg-[#d4a843]/90"
        >
          Start
        </Button>
      )}
      {booking.status === "in_progress" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={update.isPending} size="xs" className="border-none bg-[#5a9e5a] text-white hover:bg-[#5a9e5a]/90">
              Complete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete booking?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks the appointment complete and can trigger loyalty, review, and rebooking follow-up workflows.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setStatus("completed")}>Complete booking</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {open && (
        <Button disabled={update.isPending} onClick={() => setCancelOpen(true)} size="xs" variant="destructive">
          Cancel
        </Button>
      )}

      <Dialog open={cancelOpen} onOpenChange={(next) => { if (!next) closeCancel() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Booking status</p>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              Add the reason for cancelling so the booking history is clear for staff and customer follow-up.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {cancelError ? (
              <div aria-live="polite" className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]">
                {cancelError}
              </div>
            ) : null}
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Cancellation reason</span>
              <textarea
                className="min-h-28 w-full border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onChange={(event) => {
                  setReason(event.target.value)
                  setCancelError(null)
                }}
                placeholder="Customer requested cancellation, staff unavailable, duplicate booking..."
                value={reason}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button disabled={update.isPending} onClick={() => setStatus("cancelled", reason.trim())} size="sm" variant="destructive">
              {update.isPending ? "Cancelling..." : "Cancel booking"}
            </Button>
            <Button onClick={closeCancel} size="sm" variant="ghost">
              Keep booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function apiError(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
