"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { GALLERY_CATEGORIES, GalleryItemEditorDialog, type GalleryItem } from "@/components/dashboard/gallery-editor"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { assetUrl } from "@/lib/asset-url"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips, Pager } from "../ui"

type Paged = { data: GalleryItem[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }
const FILTERS = ["", ...GALLERY_CATEGORIES] as const

// The web Gallery page: public gallery photos by category; add (photo from the
// phone or a URL), edit and delete.
export default function AdminGalleryScreen() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<(typeof FILTERS)[number]>("")
  const [editing, setEditing] = useState<"create" | GalleryItem | null>(null)
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-gallery", page, category],
    queryFn: () => api.get<Paged>("/admin/gallery_items", { params: { page, category: category || undefined } }).then((r) => r.data),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/gallery_items/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] })
      toast({ title: "Gallery item deleted", description: "The image was removed from the gallery.", variant: "success" })
    },
    onError: (e) => toast({ title: "Gallery item not deleted", description: apiError(e, "Could not delete this gallery item."), variant: "error" }),
  })
  const items = data?.data ?? []

  async function remove(item: GalleryItem) {
    const ok = await confirm({
      title: "Delete gallery item?",
      message: `This will permanently delete "${item.title}" from the gallery. It will no longer appear on the public gallery page.`,
      confirmLabel: "Delete item",
      tone: "danger",
    })
    if (ok) del.mutate(item.id)
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Gallery"
        action={
          <button type="button" onClick={() => setEditing("create")} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Add
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>{data?.pagination?.total_count ?? "-"} items</p>
      {editing ? <GalleryItemEditorDialog item={editing === "create" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={category}
          onChange={(c) => {
            setCategory(c)
            setPage(1)
          }}
          label={(c) => c || "All"}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading gallery…</p>
        ) : items.length === 0 ? (
          <EmptyCard title="No gallery items yet" body="Add your first photo." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <section key={item.id} className={`${cardClass} overflow-hidden`}>
                <div className="relative aspect-square">
                  <span role="img" aria-label={item.image_alt ?? item.title} className="block size-full bg-cover bg-center" style={{ backgroundImage: `url(${assetUrl(item.image_url)})` }} />
                  <div className="absolute left-2 top-2 flex gap-1">
                    {item.featured ? <span className="rounded bg-[#C96C83] px-1.5 py-0.5 text-[0.65rem] font-bold text-white">Featured</span> : null}
                    {!item.active ? <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">Hidden</span> : null}
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className={`text-xs ${mutedClass}`}>{item.category}</p>
                  <div className="mt-2 flex gap-1.5">
                    <button type="button" onClick={() => setEditing(item)} className="h-9 flex-1 rounded-lg border border-black/10 bg-white text-xs font-bold">
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={del.isPending}
                      onClick={() => remove(item)}
                      className="h-9 flex-1 rounded-lg border border-black/10 bg-white text-xs font-bold text-[#8f3f4b] disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
