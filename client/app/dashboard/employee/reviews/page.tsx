"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"

interface Review {
  id: number
  rating: number
  body: string | null
  created_at: string
  user: { first_name: string | null; last_name: string | null }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i <= rating ? "#d4a843" : "none"} stroke="#d4a843" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

export default function EmployeeReviewsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<Review>>({
    queryKey: ["employee-reviews", page],
    queryFn: () => api.get<PagedResponse<Review>>("/employee/reviews", { params: { page } }).then((r) => r.data),
  })

  const reviews = data?.data ?? []
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"

  return (
    <div className="space-y-6">
      <DashboardHeader title="My Reviews" subtitle="Feedback from clients" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Avg Rating" value={avg} accent />
        <StatCard label="Total Reviews" value={reviews.length} />
        <StatCard label="5-Star Reviews" value={reviews.filter((r) => r.rating === 5).length} />
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No reviews yet.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-[#5f6268]">
                    {[r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || "Anonymous"}
                  </span>
                </div>
                <span className="text-xs text-[#5f6268]">
                  {new Date(r.created_at).toLocaleDateString("en-CA")}
                </span>
              </div>
              {r.body && <p className="mt-2 text-sm text-[#101217]">{r.body}</p>}
            </div>
          ))}
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
