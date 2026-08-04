"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingCard } from "@/components/dashboard/booking-card"
import { Button } from "@/components/ui/button"
import { useAdminBookings, useUpdateBooking } from "@/lib/hooks/use-admin"
import { ReassignControl } from "@/components/dashboard/reassign-control"
import type { Booking } from "@/lib/hooks/use-bookings"

const STATUSES: Array<Booking["status"] | "all"> = [
  "all", "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show",
]

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string>("all")
  const { data, isLoading } = useAdminBookings({ status: filter === "all" ? undefined : filter, page })
  const updateMutation = useUpdateBooking()

  const bookings = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <DashboardHeader title="All Bookings" subtitle="Manage company bookings" />

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1) }}
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
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No bookings found.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              actions={
                <div className="flex gap-1.5 flex-wrap">
                  {(b.status === "pending" || b.status === "confirmed" || b.status === "in_progress") && (
                    <ReassignControl bookingId={b.id} />
                  )}
                  {b.status === "confirmed" && (
                    <Button
                      size="xs"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: b.id, status: "in_progress" })}
                      style={{ background: "#d4a843", border: "none", color: "#fff" }}
                    >
                      Start
                    </Button>
                  )}
                  {b.status === "in_progress" && (
                    <Button
                      size="xs"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: b.id, status: "completed" })}
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
                    >
                      Complete
                    </Button>
                  )}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <Button
                      variant="destructive"
                      size="xs"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: b.id, status: "cancelled" })}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
