"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingCard } from "@/components/dashboard/booking-card"
import { ReviewDialog } from "@/components/dashboard/review-dialog"
import { MeetingButton } from "@/components/dashboard/meeting-button"
import { Button } from "@/components/ui/button"
import { useBookings, useCancelBooking, type Booking } from "@/lib/hooks/use-bookings"

const ALL_STATUSES: Booking["status"][] = [
  "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show",
]

export default function CustomerBookingsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Booking["status"] | "all">("all")
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const { data, isLoading } = useBookings(page)
  const cancelMutation = useCancelBooking()

  const bookings = data?.data ?? []
  const pagination = data?.pagination

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <div className="space-y-6">
      <DashboardHeader title="My Bookings" subtitle="All your past and upcoming appointments" />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...ALL_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={
              filter === s
                ? { background: "#c96c83", color: "#fff" }
                : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }
            }
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No bookings found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              actions={
                b.status === "pending" || b.status === "confirmed" ? (
                  <div className="flex items-center gap-2">
                    {b.status === "confirmed" && <MeetingButton booking={b} />}
                    <Button
                      variant="destructive"
                      size="xs"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate({ id: b.id })}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : b.status === "in_progress" ? (
                  <MeetingButton booking={b} />
                ) : b.status === "completed" ? (
                  b.has_review ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>
                      Reviewed
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      onClick={() => setReviewBooking(b)}
                      style={{ background: "#c96c83", border: "none", color: "#fff" }}
                    >
                      Leave a review
                    </Button>
                  )
                ) : null
              }
            />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-[#5f6268]">
            {page} / {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.next_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {reviewBooking && (
        <ReviewDialog
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
        />
      )}
    </div>
  )
}
