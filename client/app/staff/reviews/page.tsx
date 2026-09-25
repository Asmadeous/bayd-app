"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"

import api from "@/lib/api"
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
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export default function StaffReviewsScreen() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedReviews>({
    queryKey: ["employee-reviews", page],
    queryFn: () => api.get<PagedReviews>("/employee/reviews", { params: { page } }).then((r) => r.data),
  })
  const reviews = data?.data ?? []
  const pagination = data?.pagination
  const average = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Reviews" subtitle="What your clients said." />

      <div className="space-y-4 px-5">
        {average && (
          <div className={`${cardClass} flex items-center justify-between p-4`}>
            <div>
              <p className={eyebrowClass}>Average (this page)</p>
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
                  <p className="mt-2 text-xs text-[#14100F]/40">
                    {new Date(r.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
              Prev
            </button>
            <span className={`text-sm font-semibold ${mutedClass}`}>{page} / {pagination.total_pages}</span>
            <button type="button" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
              Next
            </button>
          </div>
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
