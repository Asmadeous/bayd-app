"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import { useSubmitReview, type Booking } from "@/lib/hooks/use-bookings"

interface ReviewDialogProps {
  booking: Booking
  onClose: () => void
}

/** Modal letting a customer rate the technician who served a completed booking. */
export function ReviewDialog({ booking, onClose }: ReviewDialogProps) {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState("")
  const submit = useSubmitReview()

  const employeeName = [
    booking.employee_profile?.user?.first_name,
    booking.employee_profile?.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")

  function handleSubmit() {
    if (rating < 1) {
      toast({
        title: "Choose a rating",
        description: "Select at least one star before submitting your review.",
        variant: "error",
      })
      return
    }

    submit.mutate(
      { bookingId: booking.id, rating, body: body.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: "Review submitted", variant: "success" })
          onClose()
        },
        onError: (error) => {
          toast({
            title: "Review could not be submitted",
            description: getApiErrorMessage(error, "Please try again."),
            variant: "error",
          })
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#101217]">Rate your service</h2>
            <p className="mt-0.5 text-sm text-[#5f6268]">
              {booking.service?.name}
              {employeeName && <> with {employeeName}</>}
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-[#5f6268] transition-colors hover:bg-black/5"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i} star${i === 1 ? "" : "s"}`}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill={i <= (hover || rating) ? "#d4a843" : "none"}
                stroke="#d4a843"
                strokeWidth="2"
                className="transition-transform hover:scale-110"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a few words about your experience (optional)…"
          rows={4}
          className="mt-5 w-full resize-none rounded-xl border border-black/10 px-3.5 py-3 text-sm text-[#101217] outline-none focus:border-[#c96c83]"
        />

        {submit.isError && (
          <p className="mt-2 text-xs text-[#d4754a]">
            Something went wrong submitting your review. Please try again.
          </p>
        )}

        <p className="mt-3 text-xs text-[#5f6268]">
          Reviews are published after a quick check by our team.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submit.isPending}
            onClick={handleSubmit}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {submit.isPending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
