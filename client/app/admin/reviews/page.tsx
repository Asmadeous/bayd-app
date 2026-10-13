"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { useAdminReviews, useApproveReview, useDeleteReview, useFeatureReview } from "@/lib/hooks/use-admin"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips, Pager } from "../ui"

const FILTERS = ["all", "pending", "approved"] as const

// The web Reviews page: approve, feature or unfeature, and delete reviews.
export default function AdminReviewsScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending")
  const { data, isLoading } = useAdminReviews({ approved: filter === "all" ? undefined : filter === "approved", page })
  const approve = useApproveReview()
  const feature = useFeatureReview()
  const del = useDeleteReview()
  const reviews = data?.data ?? []

  async function remove(id: number) {
    const ok = await confirm({
      title: "Delete this review?",
      message: "It's removed from the site and the technician's rating. This can't be undone.",
      confirmLabel: "Delete review",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(id, {
      onSuccess: () => toast({ title: "Review deleted", variant: "success" }),
      onError: (e) => toast({ title: "Review not deleted", description: apiError(e, "Please try again."), variant: "error" }),
    })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Reviews" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Moderate customer reviews.</p>
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={(f) => {
            setFilter(f)
            setPage(1)
          }}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <EmptyCard title="No reviews found" body="Customer reviews matching this filter will appear here." />
        ) : (
          reviews.map((r) => {
            const client = [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || "Anonymous"
            return (
              <section key={r.id} className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex gap-0.5" aria-label={`${r.rating} of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} aria-hidden className="size-4" fill={i <= r.rating ? "#d4a843" : "none"} stroke="#d4a843" />
                    ))}
                  </span>
                  {r.approved ? <StatusBadgeFor status="approved" /> : <StatusBadgeFor status="pending" />}
                  {r.featured ? <StatusBadgeFor status="featured" /> : null}
                </div>
                <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>
                  {client}
                  {r.employee_profile?.name ? ` to ${r.employee_profile.name}` : ""}
                </p>
                {r.body ? <p className="mt-2 text-sm leading-6">{r.body}</p> : null}
                <p className={`mt-2 text-xs font-semibold ${mutedClass}`}>{formatBookingDate(r.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
                <div className="mt-3 flex gap-2">
                  {!r.approved ? (
                    <button
                      type="button"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate(r.id, {
                          onSuccess: () => toast({ title: "Review approved", variant: "success" }),
                          onError: (e) => toast({ title: "Review not approved", description: apiError(e, "Could not approve this review."), variant: "error" }),
                        })
                      }
                      className="h-10 rounded-xl bg-[#5a9e5a] px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={feature.isPending}
                      onClick={() =>
                        feature.mutate(r.id, {
                          onSuccess: () => toast({ title: r.featured ? "Review unfeatured" : "Review featured", variant: "success" }),
                          onError: (e) => toast({ title: "Review not updated", description: apiError(e, "Please try again."), variant: "error" }),
                        })
                      }
                      className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40"
                    >
                      {r.featured ? "Unfeature" : "Feature"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={del.isPending}
                    onClick={() => remove(r.id)}
                    className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </section>
            )
          })
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
