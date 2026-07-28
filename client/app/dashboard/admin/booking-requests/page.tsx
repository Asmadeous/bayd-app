"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface BookingRequest {
  id: number
  status: string
  request_type: string
  preferred_at: string | null
  created_at: string
  user: { first_name: string | null; last_name: string | null; email: string }
  service: { name: string }
  service_area: { name: string }
}

interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

export default function AdminBookingRequestsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<BookingRequest>>({
    queryKey: ["admin-booking-requests", page, status],
    queryFn: () => api.get<PagedResponse<BookingRequest>>("/admin/booking_requests", { params: { page, status: status || undefined } }).then((r) => r.data),
  })

  const requests = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Booking Requests" subtitle="Incoming service requests pending assignment" />

      <div className="flex gap-2 flex-wrap">
        {["", "pending", "assigned", "failed"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={status === s ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : requests.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No requests found.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const name = [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || r.user?.email
            return (
              <div key={r.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#101217]">{r.service?.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "#f4f1eb", color: "#5f6268" }}>{r.status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "#f4f1eb", color: "#5f6268" }}>{r.request_type}</span>
                    </div>
                    <p className="text-xs text-[#5f6268] mt-1">
                      {name} · {r.service_area?.name}
                      {r.preferred_at && ` · ${new Date(r.preferred_at).toLocaleString("en-CA")}`}
                    </p>
                  </div>
                  <span className="text-xs text-[#5f6268]">{new Date(r.created_at).toLocaleDateString("en-CA")}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
