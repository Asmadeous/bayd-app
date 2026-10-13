"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Images, Plus, Trash2 } from "lucide-react"

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
import { GALLERY_CATEGORIES, GalleryItemEditorDialog, type GalleryItem } from "@/components/dashboard/gallery-editor"
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
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { adminGallerySteps } from "@/lib/tours/admin-gallery-tour"

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number }
}

export default function AdminGalleryPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [catFilter, setCatFilter] = useState("")
  // null = closed, "create" = new item, otherwise the item being edited.
  const [editing, setEditing] = useState<"create" | GalleryItem | null>(null)

  const { data, isLoading } = useQuery<PagedResponse<GalleryItem>>({
    queryKey: ["admin-gallery", page, catFilter],
    queryFn: () => api.get<PagedResponse<GalleryItem>>("/admin/gallery_items", { params: { page, category: catFilter || undefined } }).then((r) => r.data),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/gallery_items/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] })
      toast({ title: "Gallery item deleted", description: "The image was removed from the gallery." })
    },
    onError: (error) => toast({ title: "Gallery item not deleted", description: getApiErrorMessage(error, "Could not delete this gallery item."), variant: "error" }),
  })

  const items = data?.data ?? []

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-gallery-header">
        <DashboardHeader
          title="Gallery"
          subtitle={`${data?.pagination?.total_count ?? "—"} items`}
          actions={
            <Button size="sm" onClick={() => setEditing("create")} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus className="size-4" /> Add item
            </Button>
          }
        />
      </div>

      <DashboardToolbar data-tour="admin-gallery-filters">
        <ToolbarSection>
          <SegmentedControl>
            {["", ...GALLERY_CATEGORIES].map((category) => (
              <SegmentButton active={catFilter === category} key={category || "all"} onClick={() => setCatFilter(category)}>
                {category || "All"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {editing ? <GalleryItemEditorDialog item={editing === "create" ? null : editing} onClose={() => setEditing(null)} /> : null}

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading gallery...</p>
        </DashboardPanel>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No gallery items yet"
          description="Add your first photo above."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-tour="admin-gallery-grid">
          {items.map((item) => (
            <GalleryCard
              deleting={deleteMutation.isPending}
              item={item}
              key={item.id}
              onDelete={() => deleteMutation.mutate(item.id)}
              onEdit={() => setEditing(item)}
            />
          ))}
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

      <TutorialButton steps={adminGallerySteps} pageKey="admin-gallery" />
    </DashboardPage>
  )
}

function GalleryCard({ deleting, item, onDelete, onEdit }: {
  deleting: boolean
  item: GalleryItem
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className="group relative overflow-hidden border border-black/10 bg-white shadow-sm shadow-black/[0.03]">
      <div className="aspect-square">
        <span
          aria-label={item.image_alt ?? item.title}
          className="block size-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col justify-end bg-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-xs font-semibold text-white">{item.title}</p>
        <p className="text-xs text-white/70">{item.category}</p>
        <div className="mt-2 flex gap-1.5">
          <Button size="xs" variant="secondary" onClick={onEdit}>Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="xs" variant="destructive" disabled={deleting}>
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete gallery item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete “{item.title}” from the gallery. It will no longer appear on the public gallery page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete item</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="absolute left-2 top-2 flex gap-1">
        {item.featured ? (
          <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "#c96c83", color: "#fff" }}>Featured</span>
        ) : null}
        {!item.active ? (
          <span className="bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">Hidden</span>
        ) : null}
      </div>
    </div>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
