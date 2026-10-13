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

export interface AdminProduct {
  id: number
  name: string
  description: string | null
  price: string
  stock_quantity: number
  active: boolean
  image_url: string | null
  product_category: { id: number; name: string }
}

export interface ProductCategory {
  id: number
  name: string
}

const BLANK = {
  name: "",
  description: "",
  price: "",
  stock_quantity: 0,
  active: true,
  image_url: "",
  product_category_id: "",
}

type ProductForm = typeof BLANK
type ProductFormErrors = Partial<Record<keyof ProductForm | "base", string>>

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "Enter a valid image URL.")

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: z.string(),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => Number.isFinite(Number(value)), "Price must be a number.")
    .refine((value) => Number(value) >= 0, "Price cannot be negative."),
  stock_quantity: z.coerce.number().int("Stock must be a whole number.").min(0, "Stock cannot be negative."),
  active: z.boolean(),
  image_url: optionalUrl,
  product_category_id: z.string(),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

function formFor(product: AdminProduct | null): ProductForm {
  if (!product) return BLANK
  return {
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    stock_quantity: product.stock_quantity,
    active: product.active,
    image_url: product.image_url ?? "",
    product_category_id: String(product.product_category?.id ?? ""),
  }
}

// Creates a product (`product` null) or edits one: details, price, stock,
// category, photo and visibility. Shared by the web Products page and the
// BAYD Admin app.
export function ProductEditorDialog({
  product,
  categories,
  onClose,
}: {
  product: AdminProduct | null
  categories: ProductCategory[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState<ProductForm>(() => formFor(product))
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})
  // A picked image file (optional). When present the request is sent multipart
  // with the file; otherwise the plain JSON form is sent (image_url string still
  // works as a fallback).
  const [imageFile, setImageFile] = useState<File | null>(null)

  function requestBody() {
    if (!imageFile) return { body: form, config: undefined }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") fd.append(k, String(v))
    })
    fd.append("image", imageFile)
    return { body: fd, config: { headers: { "Content-Type": "multipart/form-data" } } }
  }

  const save = useMutation({
    mutationFn: () => {
      const { body, config } = requestBody()
      return product ? api.patch(`/admin/products/${product.id}`, body, config) : api.post("/admin/products", body, config)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] })
      onClose()
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, product ? "Could not update this product." : "Could not create this product.")
      setFormErrors({ base: message })
      toast({ title: product ? "Product not saved" : "Product not created", description: message, variant: "error" })
    },
  })

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function saveProduct() {
    const result = productSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setFormErrors(nextErrors)
      const message = nextErrors.base ?? "Check the highlighted fields and try again."
      toast({ title: "Product form needs attention", description: message, variant: "error" })
      return
    }
    setFormErrors({})
    save.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent data-tour="admin-products-editor">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Shop editor
            </p>
            <DialogTitle className="mt-1">
              {product ? "Edit Product" : "New Product"}
            </DialogTitle>
            <DialogDescription>
              Update product details, pricing, stock, category, and shop visibility.
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
            <Field error={formErrors.stock_quantity} label="Stock">
              <input
                aria-invalid={Boolean(formErrors.stock_quantity)}
                className={fieldClass(formErrors.stock_quantity)}
                min="0"
                onChange={(event) => updateForm("stock_quantity", Number(event.target.value))}
                type="number"
                value={form.stock_quantity}
              />
            </Field>
            <Field label="Category">
              <Select
                onValueChange={(value) =>
                  updateForm("product_category_id", value ?? "")
                }
                value={form.product_category_id}
              >
                <SelectTrigger>
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
            <Field error={formErrors.image_url} label="Product photo">
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
        </DialogBody>

        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={saveProduct}
            size="sm"
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {save.isPending ? "Saving..." : product ? "Save" : "Create"}
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

function getFieldErrors(error: z.ZodError): ProductFormErrors {
  const next: ProductFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof ProductFormErrors]) {
      next[key as keyof ProductFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
