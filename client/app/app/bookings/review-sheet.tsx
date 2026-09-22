"use client"

import { useState } from "react"
import { Star, X } from "lucide-react"

import { useSubmitReview, type Booking } from "@/lib/hooks/use-bookings"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { cardClass, inputClass, mutedClass } from "../app-theme"

// App-native "rate your service" sheet: a 1-5 star rating plus an optional
// comment, for a COMPLETED booking. Posts to POST /reviews via useSubmitReview
// (same endpoint + gating as the website ReviewDialog); the backend scopes it to
// the customer's own completed bookings and blocks a second review. Reviews are
// published after a team check (approved flag), so we tell the user that.
export function ReviewSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState("")
  const submit = useSubmitReview()

  const techName = booking.employee_profile?.name ?? ""

  function handleSubmit() {
    if (rating < 1) {
      toast({ title: "Choose a rating", description: "Tap at least one star.", variant: "warning" })
      return
    }
    submit.mutate(
      { bookingId: booking.id, rating, body: body.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: "Thanks for your review!", variant: "success" })
          onClose()
        },
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { error?: string } } })?.response?.data
          toast({ title: "Couldn't submit your review", description: data?.error ?? "Please try again.", variant: "error" })
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className={`w-full rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-[#14100F]">Rate your service</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#14100F]/50">
            <X className="size-5" />
          </button>
        </div>
        <p className={`mb-4 text-sm ${mutedClass}`}>
          {booking.service?.name}
          {techName ? <> with {techName}</> : null}
        </p>

        <div className="mb-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} star${i === 1 ? "" : "s"}`}>
              <Star
                className="size-9 transition-transform active:scale-95"
                stroke="#C9A45C"
                fill={i <= rating ? "#C9A45C" : "none"}
              />
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a few words about your experience (optional)…"
          rows={4}
          className={`resize-none ${inputClass}`}
        />

        <p className={`mt-3 text-xs ${mutedClass}`}>Reviews are published after a quick check by our team.</p>

        <button
          type="button"
          disabled={submit.isPending}
          onClick={handleSubmit}
          className="mt-4 w-full rounded-2xl bg-[#C96C83] py-3.5 text-base font-bold text-white disabled:opacity-50"
        >
          {submit.isPending ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  )
}
