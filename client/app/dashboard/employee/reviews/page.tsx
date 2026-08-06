"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

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

export default function EmployeeReviewsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<Review>>({
    queryKey: ["employee-reviews", page],
    queryFn: () =>
      api
        .get<PagedResponse<Review>>("/employee/reviews", { params: { page } })
        .then((response) => response.data),
  })

  const reviews = data?.data ?? []
  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "-"

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Reviews" subtitle="Feedback from clients you have served." />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard accent icon={Star} label="Avg Rating" value={average} />
        <MetricCard icon={Star} label="Total Reviews" value={reviews.length} />
        <MetricCard icon={Star} label="5-Star Reviews" value={reviews.filter((r) => r.rating === 5).length} />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading reviews...</p>
        </DashboardPanel>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Client feedback will appear here after completed appointments."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <DashboardPanel key={review.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs font-semibold text-[#5f6268]">
                    {[review.user?.first_name, review.user?.last_name].filter(Boolean).join(" ") ||
                      "Anonymous"}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#5f6268]">
                  {new Date(review.created_at).toLocaleDateString("en-CA")}
                </span>
              </div>
              {review.body ? (
                <p className="mt-3 text-sm leading-6 text-[#101217]">{review.body}</p>
              ) : null}
            </DashboardPanel>
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
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
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
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
