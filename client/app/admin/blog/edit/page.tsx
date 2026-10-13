"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { BlogPostForm, type BlogPostFormPost } from "@/components/dashboard/blog-post-form"
import api from "@/lib/api"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, mutedClass } from "../../admin-theme"

export default function AdminEditBlogPostScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <EditPost />
    </Suspense>
  )
}

function EditPost() {
  const id = Number(useSearchParams().get("id"))
  const { data: post, error, isLoading } = useQuery<BlogPostFormPost>({
    enabled: Number.isInteger(id) && id > 0,
    queryKey: ["admin-blog-post", id],
    queryFn: () => api.get<BlogPostFormPost>(`/admin/blog_posts/${id}`).then((r) => r.data),
  })

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Edit post" />
      <div className="px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading post…</p>
        ) : error || !post ? (
          <p className="text-sm font-semibold text-[#8f3f4b]">Could not load this blog post.</p>
        ) : (
          <BlogPostForm mode="edit" post={post} listHref="/admin/blog" />
        )}
      </div>
    </div>
  )
}
