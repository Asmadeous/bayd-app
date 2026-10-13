"use client"

import { BlogPostForm } from "@/components/dashboard/blog-post-form"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, mutedClass } from "../../admin-theme"

// The web New Blog Post page: the same form, back to the app's blog list.
export default function AdminNewBlogPostScreen() {
  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="New post" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Create a draft post, then publish it from the blog list when it is ready.</p>
      <div className="px-5">
        <BlogPostForm mode="create" listHref="/admin/blog" />
      </div>
    </div>
  )
}
