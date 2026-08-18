"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ImagePlus, Images, UploadCloud } from "lucide-react"
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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminGallerySteps } from "@/lib/tours/admin-gallery-tour"
import { cn } from "@/lib/utils"

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
const fieldClass =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminGalleryPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [catFilter, setCatFilter] = useState("")
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imagePreviewObjectUrlRef = useRef<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  useEffect(() => {
    return () => {
      if (imagePreviewObjectUrlRef.current) {
        URL.revokeObjectURL(imagePreviewObjectUrlRef.current)
      }
    }
  }, [])

  const { data, isLoading } = useQuery<PagedResponse<GalleryItem>>({
    queryKey: ["admin-gallery", page, catFilter],
    queryFn: () => api.get<PagedResponse<GalleryItem>>("/admin/gallery_items", { params: { page, category: catFilter || undefined } }).then((r) => r.data),
  })

  const createMutation = useMutation({ mutationFn: () => api.post("/admin/gallery_items", buildGalleryPayload(), galleryRequestConfig()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); setModal(null); resetForm(BLANK) } })
  const updateMutation = useMutation({ mutationFn: (id: number) => api.patch(`/admin/gallery_items/${id}`, buildGalleryPayload(), galleryRequestConfig()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); setModal(null) } })
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/admin/gallery_items/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery"] }) })

  const items = data?.data ?? []

  function resetForm(nextForm: typeof BLANK, previewUrl: string | null = nextForm.image_url || null) {
    if (imagePreviewObjectUrlRef.current) {
      URL.revokeObjectURL(imagePreviewObjectUrlRef.current)
      imagePreviewObjectUrlRef.current = null
    }
    setForm(nextForm)
    setSelectedImageFile(null)
    setImagePreviewUrl(previewUrl)
    setIsDraggingImage(false)
  }

  function openEdit(item: GalleryItem) {
    resetForm({
      title: item.title, category: item.category, description: item.description ?? "",
      image_url: item.image_url, image_alt: item.image_alt ?? "", size: item.size,
      featured: item.featured, active: item.active, position: item.position,
      employee_profile_id: item.employee_profile ? String(item.employee_profile.id) : "",
    }, item.image_url)
    setModal(item.id)
  }

  function handleImageFile(file: File | undefined) {
    if (!file) return

    if (imagePreviewObjectUrlRef.current) {
      URL.revokeObjectURL(imagePreviewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    imagePreviewObjectUrlRef.current = objectUrl
    setSelectedImageFile(file)
    setImagePreviewUrl(objectUrl)
  }

  function buildGalleryPayload() {
    if (!selectedImageFile) return form

    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === "image_url") return
      payload.append(key, String(value))
    })
    payload.append("image", selectedImageFile)
    return payload
  }

  function galleryRequestConfig() {
    return selectedImageFile ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-gallery-header">
        <DashboardHeader
          title="Gallery"
          subtitle={`${data?.pagination?.total_count ?? "—"} items`}
          actions={<Button size="sm" onClick={() => { resetForm(BLANK, null); setModal("create") }} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Item</Button>}
        />
      </div>

      <DashboardToolbar data-tour="admin-gallery-filters">
        <ToolbarSection>
          <SegmentedControl>
        {["", ...CATEGORIES].map((c) => (
          <SegmentButton active={catFilter === c} key={c || "all"} onClick={() => setCatFilter(c)}>
            {c || "All"}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {modal !== null && (
        <DashboardPanel className="space-y-4" data-tour="admin-gallery-form">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "Add Gallery Item" : "Edit Gallery Item"}</h3>

          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <button
              className={cn(
                "group relative flex min-h-64 overflow-hidden border border-dashed border-black/15 bg-[#fbfaf7] text-left outline-none transition-colors hover:border-[#c96c83] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20",
                isDraggingImage && "border-[#c96c83] bg-[#c96c83]/8"
              )}
              onClick={() => imageInputRef.current?.click()}
              onDragLeave={() => setIsDraggingImage(false)}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDraggingImage(true)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsDraggingImage(false)
                handleImageFile(event.dataTransfer.files?.[0])
              }}
              type="button"
            >
              {imagePreviewUrl ? (
                <span
                  aria-label={form.image_alt || form.title || "Gallery preview"}
                  className="size-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${imagePreviewUrl})` }}
                />
              ) : (
                <span className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center text-[#5f6268]">
                  <ImagePlus aria-hidden="true" className="size-10 text-[#c96c83]" />
                  <span className="text-sm font-extrabold text-[#101217]">Add gallery image</span>
                  <span className="text-xs leading-5">
                    Drop a finished service photo here or click to choose one.
                  </span>
                </span>
              )}
              {imagePreviewUrl ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/62 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <UploadCloud aria-hidden="true" className="size-4" />
                  Replace image
                </span>
              ) : null}
            </button>

            <div className="space-y-3">
              <p className="text-base font-extrabold text-[#101217]">Gallery image</p>
              <p className="max-w-xl text-sm leading-6 text-[#5f6268]">
                Choose a polished service photo that shows the final look clearly for customers
                browsing the public gallery.
              </p>
              {selectedImageFile ? (
                <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                  {selectedImageFile.name}
                </p>
              ) : form.image_url ? (
                <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                  Existing gallery image
                </p>
              ) : null}
              <input
                ref={imageInputRef}
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(event) => handleImageFile(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required
                className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Alt Text</label>
              <input value={form.image_alt} onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <Select
                onValueChange={(value) => setForm((current) => ({ ...current, category: value ?? "" }))}
                value={form.category}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelClass}>Size</label>
              <Select
                onValueChange={(value) => setForm((current) => ({ ...current, size: value ?? "standard" }))}
                value={form.size}
              >
                <SelectTrigger className="h-11 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem className="capitalize" key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelClass}>Position (sort order)</label>
              <input type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
                className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
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
            <Button size="sm" disabled={createMutation.isPending || updateMutation.isPending || !form.title || (!form.image_url && !selectedImageFile)}
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate(modal as number)}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {modal === "create" ? "Add to Gallery" : "Save Changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </DashboardPanel>
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-tour="admin-gallery-grid">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden border border-black/10 bg-white shadow-sm shadow-black/[0.03]">
              <div className="aspect-square">
                <span
                  aria-label={item.image_alt ?? item.title}
                  className="block size-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${item.image_url})` }}
                />
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
                  <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "#c96c83", color: "#fff" }}>Featured</span>
                )}
                {!item.active && (
                  <span className="bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">Hidden</span>
                )}
              </div>
            </div>
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
