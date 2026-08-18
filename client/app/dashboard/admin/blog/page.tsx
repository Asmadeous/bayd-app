"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Edit3, FileText, Plus, Trash2 } from "lucide-react"

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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import api from "@/lib/api"
import { adminBlogSteps } from "@/lib/tours/admin-blog-tour"

interface BlogPost {
  id: number
  title: string
  status: string
  published_at: string | null
  created_at: string
  author?: { first_name: string | null; last_name: string | null }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export default function AdminBlogPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<BlogPost>>({
    queryKey: ["admin-blog-posts-v2", page, status],
    queryFn: () => api.get<PagedResponse<BlogPost>>("/admin/blog_posts", { params: { page, status: status || undefined } }).then((r) => r.data),
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/publish`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] })
      toast({ title: "Post published", description: "The blog post is now visible on the public blog." })
    },
    onError: (error) => toast({ title: "Post not published", description: getApiErrorMessage(error, "Could not publish this post."), variant: "error" }),
  })
  const unpublishMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/unpublish`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] })
      toast({ title: "Post unpublished", description: "The blog post is hidden from the public blog." })
    },
    onError: (error) => toast({ title: "Post not unpublished", description: getApiErrorMessage(error, "Could not unpublish this post."), variant: "error" }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/blog_posts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] })
      toast({ title: "Post deleted", description: "The blog post was removed." })
    },
    onError: (error) => toast({ title: "Post not deleted", description: getApiErrorMessage(error, "Could not delete this post."), variant: "error" }),
  })

  const posts = data?.data ?? []

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="blog-header">
        <DashboardHeader
          title="Blog Posts"
          subtitle="Create and manage blog content."
          actions={
            <Link
              className={buttonVariants({ size: "sm" })}
              href="/dashboard/admin/blog/new"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus className="size-4" /> New post
            </Link>
          }
        />
      </div>

      <DashboardToolbar data-tour="blog-status-filter">
        <ToolbarSection>
          <SegmentedControl>
            {["", "draft", "published"].map((value) => (
              <SegmentButton active={status === value} key={value || "all"} onClick={() => setStatus(value)}>
                {value || "All"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading posts...</p>
        </DashboardPanel>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No blog posts yet"
          description="Create the first post to start publishing content."
        />
      ) : (
        <div className="space-y-3" data-tour="blog-post-list">
          {posts.map((post) => (
            <BlogPostRow
              deleting={deleteMutation.isPending}
              key={post.id}
              onDelete={() => deleteMutation.mutate(post.id)}
              onPublish={() => publishMutation.mutate(post.id)}
              onUnpublish={() => unpublishMutation.mutate(post.id)}
              post={post}
              publishing={publishMutation.isPending}
              unpublishing={unpublishMutation.isPending}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <DashboardToolbar className="justify-end" data-tour="blog-pagination">
          <ToolbarSection className="ml-auto">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}

      <TutorialButton steps={adminBlogSteps} pageKey="admin-blog" />
    </DashboardPage>
  )
}

function BlogPostRow({ deleting, onDelete, onPublish, onUnpublish, post, publishing, unpublishing }: {
  deleting: boolean
  onDelete: () => void
  onPublish: () => void
  onUnpublish: () => void
  post: BlogPost
  publishing: boolean
  unpublishing: boolean
}) {
  const author = [post.author?.first_name, post.author?.last_name].filter(Boolean).join(" ")

  return (
    <DashboardPanel className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[#101217]">{post.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5f6268]">
          {author ? <span>by {author}</span> : null}
          <StatusBadgeFor status={post.status} />
          {post.published_at ? <span>{new Date(post.published_at).toLocaleDateString("en-CA")}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Link className={buttonVariants({ size: "xs", variant: "outline" })} href={`/dashboard/admin/blog/${post.id}/edit`}>
          <Edit3 className="size-3.5" /> Edit
        </Link>
        {post.status === "draft" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={publishing} size="xs" style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>
                Publish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish blog post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will make “{post.title}” visible on the public blog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onPublish}>Publish post</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={unpublishing} size="xs" variant="outline">
                Unpublish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unpublish blog post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will hide “{post.title}” from the public blog. Existing links may stop showing the post.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onUnpublish}>Unpublish post</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={deleting} size="xs" variant="destructive">
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete “{post.title}” and remove it from the admin blog list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete post</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardPanel>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
