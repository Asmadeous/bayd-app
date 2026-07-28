"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface BlogPost { id: number; title: string; status: string; published_at: string | null; created_at: string; author: { first_name: string | null; last_name: string | null } }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

const BLANK = { title: "", body: "", excerpt: "", status: "draft" }

export default function AdminBlogPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState(BLANK)

  const { data, isLoading } = useQuery<PagedResponse<BlogPost>>({
    queryKey: ["admin-blog-posts-v2", page, status],
    queryFn: () => api.get<PagedResponse<BlogPost>>("/admin/blog_posts", { params: { page, status: status || undefined } }).then((r) => r.data),
  })

  const createMutation = useMutation({ mutationFn: () => api.post("/admin/blog_posts", form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }); setModal(null); setForm(BLANK) } })
  const updateMutation = useMutation({ mutationFn: (id: number) => api.patch(`/admin/blog_posts/${id}`, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }); setModal(null) } })
  const publishMutation = useMutation({ mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/publish`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })
  const unpublishMutation = useMutation({ mutationFn: (id: number) => api.post(`/admin/blog_posts/${id}/unpublish`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/admin/blog_posts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] }) })

  const posts = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Blog Posts" subtitle="Create and manage blog content"
        actions={<Button size="sm" onClick={() => { setForm(BLANK); setModal("create") }} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ New Post</Button>}
      />

      <div className="flex gap-2">
        {["", "draft", "published"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={status === s ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {modal !== null && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "New Blog Post" : "Edit Post"}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Excerpt</label>
              <input value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Body</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={6}
                className="w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 resize-y" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate(modal as number)}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {modal === "create" ? "Create Draft" : "Save Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : posts.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No blog posts yet.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = [p.author?.first_name, p.author?.last_name].filter(Boolean).join(" ")
            return (
              <div key={p.id} className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#101217] truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#5f6268]">
                    {author && <span>by {author}</span>}
                    <span className="px-2 py-0.5 rounded-full font-medium capitalize"
                      style={p.status === "published" ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#8a8d9322", color: "#8a8d93" }}>
                      {p.status}
                    </span>
                    {p.published_at && <span>{new Date(p.published_at).toLocaleDateString("en-CA")}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  <Button size="xs" variant="outline" onClick={() => { setForm({ title: p.title, body: "", excerpt: "", status: p.status }); setModal(p.id) }}>Edit</Button>
                  {p.status === "draft" ? (
                    <Button size="xs" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate(p.id)}
                      style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>Publish</Button>
                  ) : (
                    <Button size="xs" variant="outline" disabled={unpublishMutation.isPending} onClick={() => unpublishMutation.mutate(p.id)}>Unpublish</Button>
                  )}
                  <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(p.id) }}>Delete</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
