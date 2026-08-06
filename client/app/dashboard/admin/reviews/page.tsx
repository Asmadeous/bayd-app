"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { useAdminReviews, useApproveReview } from "@/lib/hooks/use-admin"

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          aria-hidden="true"
          className="size-3.5"
          fill={index <= rating ? "#d4a843" : "none"}
          key={index}
          stroke="#d4a843"
        />
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
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Reviews" subtitle="Moderate customer reviews." />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {(["all", "pending", "approved"] as const).map((item) => (
              <SegmentButton active={filter === item} key={item} onClick={() => setFilter(item)}>
                {item}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading reviews...</p>
        </DashboardPanel>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews found"
          description="Customer reviews matching this filter will appear here."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const clientName = [review.user?.first_name, review.user?.last_name].filter(Boolean).join(" ") || "Anonymous"
            const employeeName = [review.employee_profile?.user?.first_name, review.employee_profile?.user?.last_name].filter(Boolean).join(" ")
            return (
              <DashboardPanel key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={review.rating} />
                      <span className="text-xs font-semibold text-[#5f6268]">{clientName}</span>
                      {employeeName ? (
                        <span className="text-xs font-semibold text-[#5f6268]">to {employeeName}</span>
                      ) : null}
                      {review.approved ? <StatusBadgeFor status="approved" /> : <StatusBadgeFor status="pending" />}
                    </div>
                    {review.body ? (
                      <p className="mt-3 text-sm leading-6 text-[#101217]">{review.body}</p>
                    ) : null}
                    <p className="mt-2 text-xs font-semibold text-[#5f6268]">
                      {new Date(review.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  {!review.approved ? (
                    <Button
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(review.id)}
                      size="xs"
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
                    >
                      Approve
                    </Button>
                  ) : null}
                </div>
              </DashboardPanel>
            )
          })}
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {pagination.total_pages}
            </span>
            <Button
              disabled={!pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}
    </DashboardPage>
  )
}
