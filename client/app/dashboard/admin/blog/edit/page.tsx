"use client"

import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { BlogPostForm, type BlogPostFormPost } from "@/app/dashboard/admin/blog/_components/blog-post-form"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import api from "@/lib/api"

// The post id is a query param (?id=) not a path segment, so this static page
// works under output: export (a dynamic [id] segment can't). Read it client-side.
export default function EditBlogPostPage() {
  const id = Number(useSearchParams().get("id"))
  const { data: post, error, isLoading } = useQuery<BlogPostFormPost>({
    enabled: Number.isInteger(id) && id > 0,
    queryKey: ["admin-blog-post", id],
    queryFn: () => api.get<BlogPostFormPost>(`/admin/blog_posts/${id}`).then((r) => r.data),
  })

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Edit Blog Post"
        subtitle="Update the post content here. Publish and unpublish actions are confirmed from the blog list."
      />
      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading post...</p>
        </DashboardPanel>
      ) : error || !post ? (
        <DashboardPanel>
          <p className="text-sm font-semibold text-[#8f3f4b]">Could not load this blog post.</p>
        </DashboardPanel>
      ) : (
        <BlogPostForm mode="edit" post={post} />
      )}
    </DashboardPage>
  )
}
