"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, ImagePlus, UploadCloud } from "lucide-react"
import api from "@/lib/api"
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
import { cn } from "@/lib/utils"

interface BlogPost { id: number; title: string; body?: string | null; excerpt?: string | null; cover_image_url?: string | null; status: string; published_at: string | null; created_at: string; author: { first_name: string | null; last_name: string | null } }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

const BLANK = { title: "", body: "", excerpt: "", cover_image_url: "", status: "draft" }
const fieldClass =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminBlogPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState(BLANK)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const coverPreviewObjectUrlRef = useRef<string | null>(null)
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [isDraggingCover, setIsDraggingCover] = useState(false)

  useEffect(() => {
    return () => {
      if (coverPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(coverPreviewObjectUrlRef.current)
      }
    }
  }, [])

  const { data, isLoading } = useQuery<PagedResponse<BlogPost>>({
    queryKey: ["admin-blog-posts-v2", page, status],
    queryFn: () => api.get<PagedResponse<BlogPost>>("/admin/blog_posts", { params: { page, status: status || undefined } }).then((r) => r.data),
  })

  const createMutation = useMutation({ mutationFn: () => api.post("/admin/blog_posts", buildBlogPayload(), blogRequestConfig()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }); setModal(null); resetForm(BLANK) } })
  const updateMutation = useMutation({ mutationFn: (id: number) => api.patch(`/admin/blog_posts/${id}`, buildBlogPayload(), blogRequestConfig()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }); setModal(null) } })
  const publishMutation = useMutation({ mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/publish`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })
  const unpublishMutation = useMutation({ mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/unpublish`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/admin/blog_posts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })

  const posts = data?.data ?? []

  function resetForm(nextForm: typeof BLANK, previewUrl: string | null = nextForm.cover_image_url || null) {
    if (coverPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(coverPreviewObjectUrlRef.current)
      coverPreviewObjectUrlRef.current = null
    }
    setForm(nextForm)
    setSelectedCoverFile(null)
    setCoverPreviewUrl(previewUrl)
    setIsDraggingCover(false)
  }

  function handleCoverFile(file: File | undefined) {
    if (!file) return

    if (coverPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(coverPreviewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    coverPreviewObjectUrlRef.current = objectUrl
    setSelectedCoverFile(file)
    setCoverPreviewUrl(objectUrl)
  }

  function buildBlogPayload() {
    if (!selectedCoverFile) return form

    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === "cover_image_url") return
      payload.append(key, String(value))
    })
    payload.append("cover_image", selectedCoverFile)
    return payload
  }

  function blogRequestConfig() {
    return selectedCoverFile ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Blog Posts" subtitle="Create and manage blog content"
        actions={<Button size="sm" onClick={() => { resetForm(BLANK, null); setModal("create") }} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ New Post</Button>}
      />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
        {["", "draft", "published"].map((s) => (
          <SegmentButton active={status === s} key={s || "all"} onClick={() => setStatus(s)}>
            {s || "All"}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {modal !== null && (
        <DashboardPanel className="space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "New Blog Post" : "Edit Post"}</h3>
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <button
              className={cn(
                "group relative flex min-h-56 overflow-hidden border border-dashed border-black/15 bg-[#fbfaf7] text-left outline-none transition-colors hover:border-[#c96c83] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20",
                isDraggingCover && "border-[#c96c83] bg-[#c96c83]/8"
              )}
              onClick={() => coverInputRef.current?.click()}
              onDragLeave={() => setIsDraggingCover(false)}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDraggingCover(true)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsDraggingCover(false)
                handleCoverFile(event.dataTransfer.files?.[0])
              }}
              type="button"
            >
              {coverPreviewUrl ? (
                <span
                  aria-label={form.title || "Blog cover preview"}
                  className="size-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${coverPreviewUrl})` }}
                />
              ) : (
                <span className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center text-[#5f6268]">
                  <ImagePlus aria-hidden="true" className="size-10 text-[#c96c83]" />
                  <span className="text-sm font-extrabold text-[#101217]">Add cover image</span>
                  <span className="text-xs leading-5">
                    Drop a blog cover photo here or click to choose one.
                  </span>
                </span>
              )}
              {coverPreviewUrl ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/62 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <UploadCloud aria-hidden="true" className="size-4" />
                  Replace cover
                </span>
              ) : null}
            </button>

            <div className="space-y-3">
              <p className="text-base font-extrabold text-[#101217]">Blog cover image</p>
              <p className="max-w-xl text-sm leading-6 text-[#5f6268]">
                Choose a polished image that sets the tone for the article on the public blog.
              </p>
              {selectedCoverFile ? (
                <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                  {selectedCoverFile.name}
                </p>
              ) : form.cover_image_url ? (
                <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                  Existing cover image
                </p>
              ) : null}
              <input
                ref={coverInputRef}
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(event) => handleCoverFile(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Excerpt</label>
              <input value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={6}
                className="w-full resize-y border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={createMutation.isPending || updateMutation.isPending || !form.title}
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate(modal as number)}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {modal === "create" ? "Create Draft" : "Save Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </DashboardPanel>
      )}

      {isLoading ? <DashboardPanel><p className="text-sm text-[#5f6268]">Loading posts...</p></DashboardPanel> : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No blog posts yet"
          description="Create the first post to start publishing content."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = [p.author?.first_name, p.author?.last_name].filter(Boolean).join(" ")
            return (
              <DashboardPanel key={p.id} className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#101217]">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#5f6268]">
                    {author && <span>by {author}</span>}
                    <StatusBadgeFor status={p.status} />
                    {p.published_at && <span>{new Date(p.published_at).toLocaleDateString("en-CA")}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  <Button size="xs" variant="outline" onClick={() => { resetForm({ title: p.title, body: p.body ?? "", excerpt: p.excerpt ?? "", cover_image_url: p.cover_image_url ?? "", status: p.status }, p.cover_image_url ?? null); setModal(p.id) }}>Edit</Button>
                  {p.status === "draft" ? (
                    <Button size="xs" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate(p.id)}
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>Publish</Button>
                  ) : (
                    <Button size="xs" variant="outline" disabled={unpublishMutation.isPending} onClick={() => unpublishMutation.mutate(p.id)}>Unpublish</Button>
                  )}
                  <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(p.id) }}>Delete</Button>
                </div>
              </DashboardPanel>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}
    </DashboardPage>
  )
}
