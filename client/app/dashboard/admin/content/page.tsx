"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { adminContentSteps } from "@/lib/tours/admin-content-tour"

interface BlogPost {
  id: number
  title: string
  slug: string
  status: string
  published_at: string | null
  created_at: string
  author: { first_name: string | null; last_name: string | null }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export default function AdminContentPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<BlogPost>>({
    queryKey: ["admin-blog-posts", page],
    queryFn: () => api.get<PagedResponse<BlogPost>>("/admin/content/blog_posts", { params: { page } }).then((r) => r.data),
  })

  const posts = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <div data-tour="content-header">
        <DashboardHeader title="Content" subtitle="Manage blog posts" />
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No blog posts yet.
        </div>
      ) : (
        <div className="space-y-3" data-tour="content-post-list">
          {posts.map((post) => {
            const author = [post.author?.first_name, post.author?.last_name].filter(Boolean).join(" ")
            return (
              <div key={post.id} className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#101217] truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#5f6268] flex-wrap">
                    {author && <span>by {author}</span>}
                    <span
                      className="px-2 py-0.5 rounded-full font-medium capitalize"
                      style={
                        post.status === "published"
                          ? { background: "#5a9e5a22", color: "#5a9e5a" }
                          : { background: "#8a8d9322", color: "#8a8d93" }
                      }
                    >
                      {post.status}
                    </span>
                    {post.published_at && (
                      <span>{new Date(post.published_at).toLocaleDateString("en-CA")}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end" data-tour="content-pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <TutorialButton steps={adminContentSteps} pageKey="admin-content" />
    </div>
  )
}
