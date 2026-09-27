"use client"

import { Star } from "lucide-react"

import { LoadMore } from "@/components/load-more"
import api from "@/lib/api"
import { usePagedList } from "@/lib/hooks/use-paged-list"
import { staffScreenClass, cardClass, eyebrowClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

interface Review {
  id: number
  rating: number
  body: string | null
  created_at: string
  user: { first_name: string | null; last_name: string | null }
}
interface PagedReviews {
  data: Review[]
  average_rating: string | number | null
  pagination: { current_page: number; total_pages: number; next_page: number | null; total_count?: number }
}

export default function StaffReviewsScreen() {
  const { items: reviews, first, isLoading, hasMore, loadingMore, loadMore } = usePagedList<Review, PagedReviews>(
    ["employee-reviews", "list"],
    (page) => api.get<PagedReviews>("/employee/reviews", { params: { page } }).then((r) => r.data),
  )
  // Over every review (from the server), not just the ones loaded so far.
  const average = first?.average_rating != null ? Number(first.average_rating).toFixed(1) : null

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Reviews" />

      <div className="space-y-4 px-5">
        {average && (
          <div className={`${cardClass} flex items-center justify-between p-4`}>
            <div>
              <p className={eyebrowClass}>Average rating</p>
              <p className="mt-1 text-3xl font-black leading-none">{average}</p>
            </div>
            <Stars rating={Math.round(Number(average))} size="size-6" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <Star className="size-7 text-[#C96C83]" aria-hidden />
            <p className="font-bold">No reviews yet</p>
            <p className={`text-sm ${mutedClass}`}>Reviews clients leave will appear here.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
            {reviews.map((r) => {
              const name = [r.user.first_name, r.user.last_name].filter(Boolean).join(" ") || "A client"
              return (
                <li key={r.id} className={`${cardClass} p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{name}</p>
                    <Stars rating={r.rating} size="size-4" />
                  </div>
                  {r.body && <p className={`mt-1.5 text-sm ${mutedClass}`}>{r.body}</p>}
                  <p className="mt-2 text-sm text-[#14100F]/40">
                    {new Date(r.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </li>
              )
            })}
            </ul>
            <LoadMore hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
          </>
        )}

      </div>
    </div>
  )
}

function Stars({ rating, size }: { rating: number; size: string }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={size}
          style={{ color: "#C9A45C" }}
          fill={i <= rating ? "#C9A45C" : "none"}
          aria-hidden
        />
      ))}
    </span>
  )
}
