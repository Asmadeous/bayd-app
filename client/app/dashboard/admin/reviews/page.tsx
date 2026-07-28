"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useAdminReviews, useApproveReview } from "@/lib/hooks/use-admin"

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

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending")
  const { data, isLoading } = useAdminReviews({
    approved: filter === "all" ? undefined : filter === "approved",
    page,
  })
  const approveMutation = useApproveReview()
  const reviews = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <DashboardHeader title="Reviews" subtitle="Moderate customer reviews" />

      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={
              filter === f
                ? { background: "#c96c83", color: "#fff" }
                : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No reviews found.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const clientName = [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || "Anonymous"
            const empName = [r.employee_profile?.user?.first_name, r.employee_profile?.user?.last_name].filter(Boolean).join(" ")
            return (
              <div key={r.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-[#5f6268]">{clientName}</span>
                      {empName && <span className="text-xs text-[#5f6268]">→ {empName}</span>}
                    </div>
                    {r.body && <p className="text-sm text-[#101217] mt-1.5">{r.body}</p>}
                    <p className="text-xs text-[#5f6268] mt-1">{new Date(r.created_at).toLocaleDateString("en-CA")}</p>
                  </div>
                  {!r.approved && (
                    <Button
                      size="xs"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(r.id)}
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
                    >
                      Approve
                    </Button>
                  )}
                  {r.approved && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>
                      Approved
                    </span>
                  )}
                </div>
              </div>
            )
          })}
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
