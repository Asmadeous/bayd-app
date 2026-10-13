"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { openPaymentUrl } from "@/lib/native/open-external"
import { siteConfig } from "@/lib/site"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"

interface AdminBlogComment {
  id: number
  body: string
  author: string | null
  approved: boolean
  created_at: string
  post: { id: number; title: string; slug: string }
}

interface CommentsResponse {
  data: AdminBlogComment[]
  pending_count: number
  pagination: { total_pages: number; next_page: number | null }
}

const FILTERS = ["pending", "approved", "all"] as const

// The web Blog comments page: comments stay hidden until approved here.
export default function AdminBlogCommentsScreen() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending")
  const [page, setPage] = useState(1)
  const params = { page, approved: filter === "all" ? undefined : filter === "approved" }
  const { data, isLoading } = useQuery({
    queryKey: ["admin-blog-comments", params],
    queryFn: () => api.get<CommentsResponse>("/admin/blog_comments", { params }).then((r) => r.data),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-blog-comments"] })
  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/admin/blog_comments/${id}/approve`),
    onSuccess: () => {
      refresh()
      toast({ title: "Comment approved", description: "It now shows on the post.", variant: "success" })
    },
    onError: () => toast({ title: "Comment not approved", variant: "error" }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/blog_comments/${id}`),
    onSuccess: () => {
      refresh()
      toast({ title: "Comment deleted", variant: "success" })
    },
    onError: () => toast({ title: "Comment not deleted", variant: "error" }),
  })
  const comments = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Blog comments" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        {data?.pending_count
          ? `${data.pending_count} waiting for approval. Comments only show on the post once approved.`
          : "No comments waiting. Comments only show on the post once approved."}
      </p>
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
          <p className={`text-sm ${mutedClass}`}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <EmptyCard title="No comments" body="Comments matching this filter will appear here." />
        ) : (
          comments.map((c) => (
            <section key={c.id} className={`${cardClass} p-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold">{c.author || "Anonymous"}</span>
                <StatusBadgeFor status={c.approved ? "approved" : "pending"} />
              </div>
              <p className={`mt-1 text-sm ${mutedClass}`}>
                on{" "}
                {/* The post lives on the public website, so it opens in the browser. */}
                <button type="button" onClick={() => openPaymentUrl(`${siteConfig.url}/blog/${c.post.slug}`)} className="font-semibold text-[#C96C83]">
                  {c.post.title}
                </button>
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6">{c.body}</p>
              <p className={`mt-2 text-xs font-semibold ${mutedClass}`}>{formatBookingDate(c.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
              <div className="mt-3 flex gap-2">
                {!c.approved ? (
                  <button
                    type="button"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(c.id)}
                    className="h-10 rounded-xl bg-[#5a9e5a] px-4 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(c.id)}
                  className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </section>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
