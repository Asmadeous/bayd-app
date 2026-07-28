"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface GalleryItem {
  id: number
  title: string
  category: string
  description: string | null
  image_url: string
  image_alt: string | null
  size: string
  featured: boolean
  active: boolean
  position: number
  employee_profile: { id: number; title: string | null; user: { first_name: string | null; last_name: string | null } } | null
}

interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

const CATEGORIES = ["Lashes", "Nails", "Massage", "Pedicure", "Waxing"]
const SIZES = ["standard", "wide", "tall"]
const BLANK = { title: "", category: "Nails", description: "", image_url: "", image_alt: "", size: "standard", featured: false, active: true, position: 0, employee_profile_id: "" }

export default function AdminGalleryPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [catFilter, setCatFilter] = useState("")
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)

  const { data, isLoading } = useQuery<PagedResponse<GalleryItem>>({
    queryKey: ["admin-gallery", page, catFilter],
    queryFn: () => api.get<PagedResponse<GalleryItem>>("/admin/gallery_items", { params: { page, category: catFilter || undefined } }).then((r) => r.data),
  })

  const createMutation = useMutation({ mutationFn: () => api.post("/admin/gallery_items", form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); setModal(null); setForm(BLANK) } })
  const updateMutation = useMutation({ mutationFn: (id: number) => api.patch(`/admin/gallery_items/${id}`, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); setModal(null) } })
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/admin/gallery_items/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery"] }) })

  const items = data?.data ?? []

  function openEdit(item: GalleryItem) {
    setForm({
      title: item.title, category: item.category, description: item.description ?? "",
      image_url: item.image_url, image_alt: item.image_alt ?? "", size: item.size,
      featured: item.featured, active: item.active, position: item.position,
      employee_profile_id: item.employee_profile ? String(item.employee_profile.id) : "",
    })
    setModal(item.id)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Gallery"
        subtitle={`${data?.pagination?.total_count ?? "—"} items`}
        actions={<Button size="sm" onClick={() => { setForm(BLANK); setModal("create") }} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Item</Button>}
      />

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {["", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCatFilter(c)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={catFilter === c ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {c || "All"}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {modal !== null && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "Add Gallery Item" : "Edit Gallery Item"}</h3>

          {/* Image preview */}
          {form.image_url && (
            <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-black/8">
              <img src={form.image_url} alt={form.image_alt || "Preview"} className="size-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Image URL *</label>
              <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} required
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Alt Text</label>
              <input value={form.image_alt} onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Size</label>
              <select value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]">
                {SIZES.map((s) => <option key={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Position (sort order)</label>
              <input type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c96c83] resize-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#101217]">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="accent-[#c96c83]" />
              Featured
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#101217]">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-[#c96c83]" />
              Active (visible publicly)
            </label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" disabled={createMutation.isPending || updateMutation.isPending || !form.title || !form.image_url}
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate(modal as number)}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {modal === "create" ? "Add to Gallery" : "Save Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No gallery items yet. Add your first photo above.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-black/8 bg-white">
              <div className="aspect-square">
                <img src={item.image_url} alt={item.image_alt ?? item.title} className="size-full object-cover" />
              </div>
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                <p className="text-white/70 text-xs">{item.category}</p>
                <div className="flex gap-1.5 mt-2">
                  <Button size="xs" variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                  <Button size="xs" variant="destructive" disabled={deleteMutation.isPending}
                    onClick={() => { if (confirm(`Delete "${item.title}"?`)) deleteMutation.mutate(item.id) }}>Delete</Button>
                </div>
              </div>
              {/* Badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {item.featured && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "#c96c83", color: "#fff" }}>Featured</span>
                )}
                {!item.active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-black/60 text-white">Hidden</span>
                )}
              </div>
            </div>
          ))}
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
