"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { ImagePicker } from "@/components/image-picker"
import { useToast } from "@/components/bayd-toast-provider"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
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

export interface AdminService {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  active: boolean
  image_url: string | null
  service_category: { id: number; name: string }
  prices?: Record<string, string>
  tier_prices?: Record<string, number>
  group_size?: number
}

export interface ServiceCategory {
  id: number
  name: string
}

export const TIER_FIELDS: { key: "kids" | "elderly" | "group"; label: string }[] = [
  { key: "kids", label: "Kids ($)" },
  { key: "elderly", label: "Elderly ($)" },
  { key: "group", label: "Group of 5 ($)" },
]

const BLANK = {
  name: "",
  description: "",
  duration_minutes: 60,
  price: "",
  active: true,
  image_url: "",
  service_category_id: "",
  prices: { kids: "", elderly: "", group: "" } as Record<"kids" | "elderly" | "group", string>,
}

type ServiceForm = typeof BLANK
type ServiceFormErrors = Partial<Record<keyof ServiceForm | keyof ServiceForm["prices"] | "base", string>>

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "Enter a valid image URL.")

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => !value || Number(value) >= 0, `${label} cannot be negative.`)

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: z.string(),
  duration_minutes: z.coerce.number().int("Duration must be a whole number.").positive("Duration must be greater than 0."),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => Number.isFinite(Number(value)), "Price must be a number.")
    .refine((value) => Number(value) >= 0, "Price cannot be negative."),
  active: z.boolean(),
  image_url: optionalUrl,
  service_category_id: z.string().trim().min(1, "Category is required."),
  prices: z.object({
    kids: optionalMoney("Kids price"),
    elderly: optionalMoney("Elderly price"),
    group: optionalMoney("Group price"),
  }),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

function formFor(service: AdminService | null): ServiceForm {
  if (!service) return BLANK
  const tierPrices = service.tier_prices ?? {}
  return {
    name: service.name,
    description: service.description ?? "",
    duration_minutes: service.duration_minutes,
    price: service.price,
    active: service.active,
    image_url: service.image_url ?? "",
    service_category_id: String(service.service_category?.id ?? ""),
    prices: {
      kids: tierPrices.kids != null ? String(tierPrices.kids) : "",
      elderly: tierPrices.elderly != null ? String(tierPrices.elderly) : "",
      group: tierPrices.group != null ? String(tierPrices.group) : "",
    },
  }
}

// Creates a service (`service` null) or edits one: details, price tiers,
// category, photo and visibility. Shared by the web Services page and the
// BAYD Admin app.
export function ServiceEditorDialog({
  service,
  categories,
  onClose,
}: {
  service: AdminService | null
  categories: ServiceCategory[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState<ServiceForm>(() => formFor(service))
  const [formErrors, setFormErrors] = useState<ServiceFormErrors>({})
  // Optional picked image. With a file, send multipart (nested prices go as
  // prices[kids]=... bracket notation so Rails parses them into a hash).
  const [imageFile, setImageFile] = useState<File | null>(null)

  function requestBody() {
    if (!imageFile) return { body: form, config: undefined }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return
      if (k === "prices" && typeof v === "object") {
        Object.entries(v as Record<string, string>).forEach(([pk, pv]) => {
          if (pv !== "") fd.append(`prices[${pk}]`, String(pv))
        })
      } else {
        fd.append(k, String(v))
      }
    })
    fd.append("image", imageFile)
    return { body: fd, config: { headers: { "Content-Type": "multipart/form-data" } } }
  }

  const save = useMutation({
    mutationFn: () => {
      const { body, config } = requestBody()
      return service ? api.patch(`/admin/services/${service.id}`, body, config) : api.post("/admin/services", body, config)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] })
      onClose()
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, service ? "Could not update this service." : "Could not create this service.")
      setFormErrors({ base: message })
      toast({ title: service ? "Service not saved" : "Service not created", description: message, variant: "error" })
    },
  })

  function updateForm<K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    clearFieldError(key)
  }

  function updateTierPrice(key: keyof ServiceForm["prices"], value: string) {
    setForm((current) => ({
      ...current,
      prices: { ...current.prices, [key]: value },
    }))
    clearFieldError(key)
  }

  function clearFieldError(key: keyof ServiceFormErrors) {
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function saveService() {
    const result = serviceSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setFormErrors(nextErrors)
      const message = nextErrors.base ?? "Check the highlighted fields and try again."
      toast({ title: "Service form needs attention", description: message, variant: "error" })
      return
    }
    setFormErrors({})
    save.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent data-tour="admin-services-editor">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Catalog editor
            </p>
            <DialogTitle className="mt-1">
              {service ? "Edit Service" : "New Service"}
            </DialogTitle>
            <DialogDescription>
              Update service details, pricing, booking category, and catalog visibility.
            </DialogDescription>
          </div>
          <StatusBadgeFor status={form.active ? "active" : "inactive"} />
        </DialogHeader>

        <DialogBody>
          {formErrors.base ? (
            <div
              aria-live="polite"
              className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
            >
              {formErrors.base}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field error={formErrors.name} label="Name">
              <input
                aria-invalid={Boolean(formErrors.name)}
                className={fieldClass(formErrors.name)}
                onChange={(event) => updateForm("name", event.target.value)}
                type="text"
                value={form.name}
              />
            </Field>
            <Field error={formErrors.price} label="Price ($)">
              <input
                aria-invalid={Boolean(formErrors.price)}
                className={fieldClass(formErrors.price)}
                min="0"
                onChange={(event) => updateForm("price", event.target.value)}
                step="0.01"
                type="number"
                value={form.price}
              />
            </Field>
            <Field error={formErrors.duration_minutes} label="Duration">
              <input
                aria-invalid={Boolean(formErrors.duration_minutes)}
                className={fieldClass(formErrors.duration_minutes)}
                min="1"
                onChange={(event) => updateForm("duration_minutes", Number(event.target.value))}
                type="number"
                value={form.duration_minutes}
              />
            </Field>
            <Field error={formErrors.service_category_id} label="Category">
              <Select
                onValueChange={(value) =>
                  updateForm("service_category_id", value ?? "")
                }
                value={form.service_category_id}
              >
                <SelectTrigger aria-invalid={Boolean(formErrors.service_category_id)}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field error={formErrors.image_url} label="Service photo">
              <ImagePicker
                currentUrl={form.image_url || null}
                onPick={setImageFile}
                label="Photo"
              />
            </Field>
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217] md:mt-6">
              <input
                checked={form.active}
                className="accent-[#c96c83]"
                id="svc-active"
                onChange={(event) => updateForm("active", event.target.checked)}
                type="checkbox"
              />
              Active
            </label>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <textarea
                className="min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onChange={(event) => updateForm("description", event.target.value)}
                value={form.description}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className={labelClass}>Price tiers</p>
            <div className="grid gap-4 md:grid-cols-3">
              {TIER_FIELDS.map((tier) => (
                <Field key={tier.key} error={formErrors[tier.key]} label={tier.label}>
                  <input
                    aria-invalid={Boolean(formErrors[tier.key])}
                    className={fieldClass(formErrors[tier.key])}
                    min="0"
                    onChange={(event) => updateTierPrice(tier.key, event.target.value)}
                    placeholder={form.price || "-"}
                    step="0.01"
                    type="number"
                    value={form.prices[tier.key]}
                  />
                </Field>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={saveService}
            size="sm"
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {save.isPending ? "Saving..." : service ? "Save" : "Create"}
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputClass} ${error ? errorInputClass : ""}`
}

function getFieldErrors(error: z.ZodError): ServiceFormErrors {
  const next: ServiceFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof ServiceFormErrors]) {
      next[key as keyof ServiceFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
