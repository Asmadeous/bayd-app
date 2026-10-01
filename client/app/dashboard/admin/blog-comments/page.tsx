"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircle } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
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
import api from "@/lib/api"

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

type Filter = "pending" | "approved" | "all"

// Comments on blog posts stay hidden until an admin approves them here.
export default function AdminBlogCommentsPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>("pending")
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
  const pagination = data?.pagination

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Blog comments"
        subtitle={
          data?.pending_count
            ? `${data.pending_count} waiting for approval. Comments only show on the post once approved.`
            : "No comments waiting. Comments only show on the post once approved."
        }
      />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {(["pending", "approved", "all"] as const).map((item) => (
              <SegmentButton
                active={filter === item}
                key={item}
                onClick={() => {
                  setFilter(item)
                  setPage(1)
                }}
              >
                {item}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading comments...</p>
        </DashboardPanel>
      ) : comments.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No comments" description="Comments matching this filter will appear here." />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <DashboardPanel key={comment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-[#101217]">{comment.author || "Anonymous"}</span>
                    <StatusBadgeFor status={comment.approved ? "approved" : "pending"} />
                    <span className="text-xs text-[#5f6268]">
                      on{" "}
                      <Link href={`/blog/${comment.post.slug}`} className="font-semibold text-[#c96c83] hover:underline">
                        {comment.post.title}
                      </Link>
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#101217]">{comment.body}</p>
                  <p className="mt-2 text-xs font-semibold text-[#5f6268]">
                    {new Date(comment.created_at).toLocaleDateString("en-CA")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!comment.approved ? (
                    <Button
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(comment.id)}
                      size="xs"
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
                    >
                      Approve
                    </Button>
                  ) : null}
                  <Button disabled={remove.isPending} onClick={() => remove.mutate(comment.id)} size="xs" variant="outline">
                    Delete
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} size="sm" variant="outline">
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {pagination.total_pages}
            </span>
            <Button disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)} size="sm" variant="outline">
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}
    </DashboardPage>
  )
}
