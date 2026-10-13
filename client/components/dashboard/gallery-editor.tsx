"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Images } from "lucide-react"
import { z } from "zod"

import { ImagePicker } from "@/components/image-picker"
import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { buildFormData } from "@/lib/build-form-data"
import { assetUrl } from "@/lib/asset-url"

export interface GalleryItem {
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

export const GALLERY_CATEGORIES = ["Team", "Lashes", "Nails", "Pedicure", "Massage"] as const
const SIZES = ["standard", "wide", "tall"] as const
type GalleryFormState = {
  title: string
  category: string
  description: string
  image_url: string
  image_alt: string
  size: string
  featured: boolean
  active: boolean
  position: string
  employee_profile_id: string
}

const BLANK: GalleryFormState = {
  title: "",
  category: "Nails",
  description: "",
  image_url: "",
  image_alt: "",
  size: "standard",
  featured: false,
  active: true,
  position: "0",
  employee_profile_id: "",
}

type GalleryFormErrors = Partial<Record<keyof GalleryFormState | "base", string>>

const gallerySchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  category: z.enum(GALLERY_CATEGORIES, "Choose a valid category."),
  description: z.string(),
  // Optional: an uploaded photo can stand in for a URL. Validated in the submit
  // handler (either a file OR a valid URL must be present).
  image_url: z
    .string()
    .trim()
    .refine((value) => value === "" || z.url().safeParse(value).success, "Enter a valid image URL."),
  image_alt: z.string(),
  size: z.enum(SIZES, "Choose a valid display size."),
  featured: z.boolean(),
  active: z.boolean(),
  position: z
    .string()
    .trim()
    .min(1, "Position is required.")
    .refine((value) => Number.isInteger(Number(value)), "Position must be a whole number."),
  employee_profile_id: z.string(),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

function formFor(item: GalleryItem | null): GalleryFormState {
  if (!item) return BLANK
  return {
    title: item.title,
    category: item.category,
    description: item.description ?? "",
    image_url: item.image_url,
    image_alt: item.image_alt ?? "",
    size: item.size,
    featured: item.featured,
    active: item.active,
    position: String(item.position),
    employee_profile_id: item.employee_profile ? String(item.employee_profile.id) : "",
  }
}

// Adds a gallery photo (`item` null) or edits one: photo, title, alt text,
// category, display size, position and visibility. Shared by the web Gallery
// page and the BAYD Admin app.
export function GalleryItemEditorDialog({ item, onClose }: { item: GalleryItem | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState<GalleryFormState>(() => formFor(item))
  const [errors, setErrors] = useState<GalleryFormErrors>({})
  const [imageFile, setImageFile] = useState<File | null>(null)

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown> | FormData) =>
      (item ? api.patch(`/admin/gallery_items/${item.id}`, payload) : api.post("/admin/gallery_items", payload)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] })
      toast(
        item
          ? { title: "Gallery item updated", description: "The gallery item changes were saved." }
          : { title: "Gallery item added", description: "The new image is available in the gallery." },
      )
      onClose()
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, item ? "Could not update this gallery item." : "Could not add this gallery item.")
      setErrors({ base: message })
      toast({ title: "Gallery item not saved", description: message, variant: "error" })
    },
  })
  const saving = save.isPending

  function set<K extends keyof GalleryFormState>(key: K, value: GalleryFormState[K]) {
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
    const result = gallerySchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setErrors(nextErrors)
      toast({
        title: "Gallery item needs attention",
        description: nextErrors.base ?? "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    // Need either an uploaded photo or an image URL.
    if (!imageFile && !form.image_url.trim()) {
      setErrors({ image_url: "Upload a photo or enter an image URL." })
      toast({ title: "Photo required", description: "Upload a photo or enter an image URL.", variant: "error" })
      return
    }

    const fields = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      image_url: form.image_url.trim() || undefined,
      image_alt: form.image_alt.trim() || undefined,
      size: form.size,
      featured: form.featured,
      active: form.active,
      position: Number(form.position),
      employee_profile_id: form.employee_profile_id || undefined,
    }

    // With a picked file, send multipart (the API attaches params[:image]).
    const payload: Record<string, unknown> | FormData = imageFile
      ? buildFormData(fields, imageFile)
      : fields

    save.mutate(payload)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent data-tour="admin-gallery-form" className="max-w-4xl">
        <DialogHeader className="pr-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
            Gallery
          </p>
          <DialogTitle>{item ? "Edit gallery item" : "Add gallery item"}</DialogTitle>
          <DialogDescription>
            Add a public gallery image URL, category, display size, and visibility details.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {errors.base ? (
            <div
              aria-live="polite"
              className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
            >
              {errors.base}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="flex min-h-64 overflow-hidden border border-black/10 bg-[#fbfaf7]">
                {form.image_url ? (
                  <span
                    aria-label={form.image_alt || form.title || "Gallery preview"}
                    className="size-full bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${assetUrl(form.image_url)})` }}
                  />
                ) : (
                  <span className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center text-[#5f6268]">
                    <Images aria-hidden="true" className="size-10 text-[#c96c83]" />
                    <span className="text-sm font-extrabold text-[#101217]">Image preview</span>
                    <span className="text-xs leading-5">
                      Add an image URL to preview the gallery item.
                    </span>
                  </span>
                )}
              </div>
              <Field error={errors.image_url} label="Gallery photo">
                <ImagePicker
                  currentUrl={form.image_url || null}
                  onPick={setImageFile}
                  label="Photo"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={errors.title} label="Title">
                <input
                  aria-invalid={Boolean(errors.title)}
                  className={fieldClass(errors.title)}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="Example: Classic lash set"
                  value={form.title}
                />
              </Field>
              <Field error={errors.image_alt} label="Alt text">
                <input
                  aria-invalid={Boolean(errors.image_alt)}
                  className={fieldClass(errors.image_alt)}
                  onChange={(event) => set("image_alt", event.target.value)}
                  placeholder="Describe the image for accessibility"
                  value={form.image_alt}
                />
              </Field>
              <Field error={errors.category} label="Category">
                <Select onValueChange={(value) => set("category", value ?? "Nails")} value={form.category}>
                  <SelectTrigger aria-invalid={Boolean(errors.category)} className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GALLERY_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field error={errors.size} label="Display size">
                <Select onValueChange={(value) => set("size", value ?? "standard")} value={form.size}>
                  <SelectTrigger aria-invalid={Boolean(errors.size)} className="h-10 capitalize">
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
              </Field>
              <Field error={errors.position} label="Position">
                <input
                  aria-invalid={Boolean(errors.position)}
                  className={fieldClass(errors.position)}
                  inputMode="numeric"
                  onChange={(event) => set("position", event.target.value)}
                  placeholder="0"
                  type="number"
                  value={form.position}
                />
              </Field>
              <Field className="sm:col-span-2" error={errors.description} label="Description">
                <textarea
                  aria-invalid={Boolean(errors.description)}
                  className={`min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 ${errors.description ? errorInputClass : ""}`}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="Optional short description"
                  value={form.description}
                />
              </Field>
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#101217]">
                  <input
                    checked={form.featured}
                    className="accent-[#c96c83]"
                    onChange={(event) => set("featured", event.target.checked)}
                    type="checkbox"
                  />
                  Featured
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#101217]">
                  <input
                    checked={form.active}
                    className="accent-[#c96c83]"
                    onChange={(event) => set("active", event.target.checked)}
                    type="checkbox"
                  />
                  Active publicly
                </label>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button size="sm" disabled={saving || !form.title || (!form.image_url && !imageFile)} onClick={submit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            {saving ? "Saving..." : item ? "Save changes" : "Add to gallery"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function getFieldErrors(error: z.ZodError<GalleryFormState>): GalleryFormErrors {
  const next: GalleryFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof GalleryFormErrors]) {
      next[key as keyof GalleryFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
