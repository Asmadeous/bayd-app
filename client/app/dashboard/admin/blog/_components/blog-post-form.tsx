"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ImagePlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button, buttonVariants } from "@/components/ui/button"
import api from "@/lib/api"

export interface BlogPostFormPost {
  id: number
  title: string
  body?: string | null
  excerpt?: string | null
  cover_image_url?: string | null
  category?: string | null
  status: string
}

type BlogPostFormState = {
  title: string
  excerpt: string
  body: string
  category: string
  cover_image_url: string
}

type BlogPostFormErrors = Partial<Record<keyof BlogPostFormState | "base", string>>

const blogPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  excerpt: z.string(),
  body: z.string().trim().min(1, "Body is required."),
  category: z.string(),
  cover_image_url: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.url().safeParse(value).success, "Enter a valid cover image URL."),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export function BlogPostForm({ mode, post }: { mode: "create" | "edit"; post?: BlogPostFormPost }) {
  const router = useRouter()
  const qc = useQueryClient()
  const { toast } = useToast()
  const initial = useMemo(() => ({
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "",
    cover_image_url: post?.cover_image_url ?? "",
  }), [post])
  const [form, setForm] = useState<BlogPostFormState>(initial)
  const [errors, setErrors] = useState<BlogPostFormErrors>({})

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (mode === "edit" && post) {
        return api.patch(`/admin/blog_posts/${post.id}`, payload).then((r) => r.data)
      }
      return api.post("/admin/blog_posts", { ...payload, status: "draft" }).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] })
      toast({
        title: mode === "create" ? "Draft created" : "Post updated",
        description: mode === "create" ? "The blog post was saved as a draft." : "The blog post changes were saved.",
      })
      router.push("/dashboard/admin/blog")
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Could not save this blog post.")
      setErrors({ base: message })
      toast({ title: "Blog post not saved", description: message, variant: "error" })
    },
  })

  function set<K extends keyof BlogPostFormState>(key: K, value: BlogPostFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function submit() {
    const result = blogPostSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setErrors(nextErrors)
      toast({
        title: "Blog post needs attention",
        description: nextErrors.base ?? "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    saveMutation.mutate({
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      body: form.body.trim(),
      category: form.category.trim() || undefined,
      cover_image_url: form.cover_image_url.trim() || undefined,
    })
  }

  return (
    <DashboardPanel className="space-y-5" data-tour="blog-editor">
      {errors.base ? (
        <div
          aria-live="polite"
          className="border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
        >
          {errors.base}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex min-h-56 overflow-hidden border border-black/10 bg-[#fbfaf7]">
            {form.cover_image_url ? (
              <span
                aria-label={form.title || "Blog cover preview"}
                className="size-full bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${form.cover_image_url})` }}
              />
            ) : (
              <span className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center text-[#5f6268]">
                <ImagePlus aria-hidden="true" className="size-10 text-[#c96c83]" />
                <span className="text-sm font-extrabold text-[#101217]">Cover preview</span>
                <span className="text-xs leading-5">
                  Add a cover image URL to preview how the post will appear.
                </span>
              </span>
            )}
          </div>
          <Field error={errors.cover_image_url} label="Cover image URL">
            <input
              aria-invalid={Boolean(errors.cover_image_url)}
              className={fieldClass(errors.cover_image_url)}
              onChange={(event) => set("cover_image_url", event.target.value)}
              placeholder="https://example.com/image.jpg"
              value={form.cover_image_url}
            />
          </Field>
        </div>

        <div className="space-y-4">
          <Field error={errors.title} label="Title">
            <input
              aria-invalid={Boolean(errors.title)}
              className={fieldClass(errors.title)}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Post title"
              value={form.title}
            />
          </Field>
          <Field error={errors.category} label="Category">
            <input
              aria-invalid={Boolean(errors.category)}
              className={fieldClass(errors.category)}
              onChange={(event) => set("category", event.target.value)}
              placeholder="Example: Beauty tips"
              value={form.category}
            />
          </Field>
          <Field error={errors.excerpt} label="Excerpt">
            <textarea
              aria-invalid={Boolean(errors.excerpt)}
              className={`min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 ${errors.excerpt ? errorInputClass : ""}`}
              onChange={(event) => set("excerpt", event.target.value)}
              placeholder="Short summary shown in blog cards"
              value={form.excerpt}
            />
          </Field>
          <Field error={errors.body} label="Body">
            <textarea
              aria-invalid={Boolean(errors.body)}
              className={`min-h-80 w-full resize-y border border-black/15 bg-white px-3 py-2.5 text-sm leading-6 text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 ${errors.body ? errorInputClass : ""}`}
              onChange={(event) => set("body", event.target.value)}
              placeholder="Write the blog post content"
              value={form.body}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-black/8 pt-4">
        <Button
          disabled={saveMutation.isPending || !form.title}
          onClick={submit}
          size="sm"
          style={{ background: "#c96c83", border: "none", color: "#fff" }}
        >
          {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create draft" : "Save changes"}
        </Button>
        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/dashboard/admin/blog">
          <ArrowLeft className="size-3.5" /> Back to posts
        </Link>
      </div>
    </DashboardPanel>
  )
}

function Field({ children, className, error, label }: {
  children: React.ReactNode
  className?: string
  error?: string
  label: string
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputClass} ${error ? errorInputClass : ""}`
}

function getFieldErrors(error: z.ZodError<BlogPostFormState>): BlogPostFormErrors {
  const next: BlogPostFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof BlogPostFormErrors]) {
      next[key as keyof BlogPostFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
