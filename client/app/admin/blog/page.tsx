"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips, Pager } from "../ui"

interface BlogPost {
  id: number
  title: string
  status: string
  published_at: string | null
  created_at: string
  author?: { first_name: string | null; last_name: string | null }
}

type Paged = { data: BlogPost[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }
const FILTERS = ["", "draft", "published"] as const

// The web Blog Posts page: drafts and published posts with edit, publish,
// unpublish and delete.
export default function AdminBlogScreen() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("")
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-blog-posts-v2", page, status],
    queryFn: () => api.get<Paged>("/admin/blog_posts", { params: { page, status: status || undefined } }).then((r) => r.data),
  })
  const posts = data?.data ?? []
  const done = (title: string, description: string) => () => {
    qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] })
    toast({ title, description, variant: "success" })
  }
  const publish = useMutation({
    mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/publish`).then((r) => r.data),
    onSuccess: done("Post published", "The blog post is now visible on the public blog."),
    onError: (e) => toast({ title: "Post not published", description: apiError(e, "Could not publish this post."), variant: "error" }),
  })
  const unpublish = useMutation({
    mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/unpublish`).then((r) => r.data),
    onSuccess: done("Post unpublished", "The blog post is hidden from the public blog."),
    onError: (e) => toast({ title: "Post not unpublished", description: apiError(e, "Could not unpublish this post."), variant: "error" }),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/blog_posts/${id}`).then((r) => r.data),
    onSuccess: done("Post deleted", "The blog post was removed."),
    onError: (e) => toast({ title: "Post not deleted", description: apiError(e, "Could not delete this post."), variant: "error" }),
  })

  async function ask(title: string, message: string, confirmLabel: string, tone: "danger" | "default" = "default") {
    return confirm({ title, message, confirmLabel, tone })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Blog posts"
        action={
          <Link href="/admin/blog/new" className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> New
          </Link>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Create and manage blog content.</p>
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={status}
          onChange={(s) => {
            setStatus(s)
            setPage(1)
          }}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading posts…</p>
        ) : posts.length === 0 ? (
          <EmptyCard title="No blog posts yet" body="Create the first post to start publishing content." />
        ) : (
          posts.map((post) => {
            const author = [post.author?.first_name, post.author?.last_name].filter(Boolean).join(" ")
            return (
              <section key={post.id} className={`${cardClass} p-4`}>
                <p className="text-base font-bold">{post.title}</p>
                <div className={`mt-1 flex flex-wrap items-center gap-2 text-sm ${mutedClass}`}>
                  {author ? <span>by {author}</span> : null}
                  <StatusBadgeFor status={post.status} />
                  {post.published_at ? <span>{formatBookingDate(post.published_at, { month: "short", day: "numeric", year: "numeric" })}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/admin/blog/edit?id=${post.id}`} className="grid h-10 place-items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                  {post.status === "draft" ? (
                    <button
                      type="button"
                      disabled={publish.isPending}
                      onClick={async () => {
                        if (await ask("Publish blog post?", `This will make "${post.title}" visible on the public blog.`, "Publish post")) publish.mutate(post.id)
                      }}
                      className="h-10 rounded-xl bg-[#5a9e5a] px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={unpublish.isPending}
                      onClick={async () => {
                        if (await ask("Unpublish blog post?", `This will hide "${post.title}" from the public blog. Existing links may stop showing the post.`, "Unpublish post"))
                          unpublish.mutate(post.id)
                      }}
                      className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40"
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={del.isPending}
                    onClick={async () => {
                      if (await ask("Delete blog post?", `This will permanently delete "${post.title}" and remove it from the admin blog list.`, "Delete post", "danger"))
                        del.mutate(post.id)
                    }}
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
