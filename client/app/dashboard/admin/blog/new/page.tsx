"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { BlogPostForm } from "@/app/dashboard/admin/blog/_components/blog-post-form"

export default function NewBlogPostPage() {
  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="New Blog Post"
        subtitle="Create a draft post, then publish it from the blog list when it is ready."
      />
      <BlogPostForm mode="create" />
    </DashboardPage>
  )
}
