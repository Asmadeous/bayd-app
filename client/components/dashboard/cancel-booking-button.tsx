"use client"

import { useToast } from "@/components/bayd-toast-provider"
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
import { useCancelBooking, type Booking } from "@/lib/hooks/use-bookings"

// Mirrors BookingsController::CANCEL_CUTOFF_HOURS so the button never offers a
// cancel the API will refuse.
const CANCEL_CUTOFF_MS = 24 * 60 * 60 * 1000

export function canSelfCancel(booking: Booking, now = Date.now()) {
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    new Date(booking.starts_at).getTime() - now > CANCEL_CUTOFF_MS
  )
}

// Customer self-cancel with a confirm step. Inside the 24h window it shows a
// "call us" hint instead, matching the app.
export function CancelBookingButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const cancel = useCancelBooking()

  if (booking.status !== "pending" && booking.status !== "confirmed") return null
  if (!canSelfCancel(booking)) {
    return <span className="text-xs text-[#5f6268]">Less than 24h away - call us to cancel.</span>
  }

  function confirmCancel() {
    cancel.mutate(
      { id: booking.id },
      {
        onSuccess: () => toast({ title: "Booking cancelled", variant: "success" }),
        onError: (error) => {
          const data = (error as { response?: { data?: { error?: string } } })?.response?.data
          toast({
            title: "Booking not cancelled",
            description: data?.error ?? "Could not cancel this booking.",
            variant: "error",
          })
        },
      },
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="xs" disabled={cancel.isPending}>
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel {booking.service?.name ?? "this appointment"}. You may need to book again if you change your mind.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep booking</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCancel}>Cancel booking</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
