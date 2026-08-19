"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/dashboard/data-table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
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
import { adminProductsSteps } from "@/lib/tours/admin-products-tour"

interface Product {
  id: number
  name: string
  description: string | null
  price: string
  stock_quantity: number
  active: boolean
  image_url: string | null
  product_category: { id: number; name: string }
}

interface Category {
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

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.get<{ data: Product[] }>("/admin/products").then((response) => response.data),
  })
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-product-categories"],
    queryFn: () =>
      api.get<Category[]>("/admin/product_categories").then((response) => response.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post("/admin/products", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] })
      setModal(null)
      setForm(BLANK)
      setFormErrors({})
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not create this product.")
      setFormErrors({ base: message })
      toast({ title: "Product not created", description: message, variant: "error" })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/products/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] })
      setModal(null)
      setFormErrors({})
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not update this product.")
      setFormErrors({ base: message })
      toast({ title: "Product not saved", description: message, variant: "error" })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  })

  const products = productsData?.data ?? []
  const activeCount = products.filter((product) => product.active).length
  const lowStockCount = products.filter((product) => product.stock_quantity <= 5).length

  function openCreate() {
    setForm(BLANK)
    setFormErrors({})
    setModal("create")
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      stock_quantity: product.stock_quantity,
      active: product.active,
      image_url: product.image_url ?? "",
      product_category_id: String(product.product_category?.id ?? ""),
    })
    setFormErrors({})
    setModal(product.id)
  }

  function closeEditor() {
    setFormErrors({})
    setModal(null)
  }

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    clearFieldError(key)
  }

  function clearFieldError(key: keyof ProductFormErrors) {
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

    if (modal === "create") {
      createMutation.mutate()
    } else if (typeof modal === "number") {
      updateMutation.mutate(modal)
    }
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-products-header">
        <DashboardHeader
          actions={
            <Button
              data-tour="admin-products-add"
              onClick={openCreate}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Product
            </Button>
          }
          title="Products"
          subtitle="Manage shop products, stock levels, and catalog status."
        />
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) closeEditor() }}>
        <DialogContent data-tour="admin-products-editor">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Shop editor
              </p>
              <DialogTitle className="mt-1">
                {modal === "create" ? "New Product" : "Edit Product"}
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
              <Field error={formErrors.image_url} label="Image URL">
                <input
                  aria-invalid={Boolean(formErrors.image_url)}
                  className={fieldClass(formErrors.image_url)}
                  onChange={(event) => updateForm("image_url", event.target.value)}
                  type="url"
                  value={form.image_url}
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
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={saveProduct}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : modal === "create" ? "Create" : "Save"}
            </Button>
            <Button onClick={closeEditor} size="sm" variant="ghost">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardPanel
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-tour="admin-products-stats"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Catalog</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Product Library</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#5f6268]">
          <span>{products.length} total</span>
          <span className="text-black/25">/</span>
          <span>{activeCount} active</span>
          <span className="text-black/25">/</span>
          <span>{lowStockCount} low stock</span>
        </div>
      </DashboardPanel>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading products...</p>
        </DashboardPanel>
      ) : products.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={openCreate}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Product
            </Button>
          }
          icon={Package}
          title="No products yet"
          description="Create the first product for the shop catalog."
        />
      ) : (
        <div data-tour="admin-products-list">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell>Price</DataTableHeaderCell>
                <DataTableHeaderCell>Stock</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {products.map((product) => (
                <DataTableRow key={product.id}>
                  <DataTableCell className="font-bold text-[#101217]">{product.name}</DataTableCell>
                  <DataTableCell>{product.product_category?.name}</DataTableCell>
                  <DataTableCell className="font-semibold text-[#101217]">${product.price}</DataTableCell>
                  <DataTableCell>{product.stock_quantity}</DataTableCell>
                  <DataTableCell>
                    <StatusBadgeFor status={product.active ? "active" : "inactive"} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEdit(product)} size="xs" variant="outline">
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={deleteMutation.isPending}
                            size="xs"
                            variant="destructive"
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove &quot;{product.name}&quot; from the shop catalog. Customers
                              will no longer be able to buy it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(product.id)}
                            >
                              Delete product
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      <TutorialButton steps={adminProductsSteps} pageKey="admin-products" />
    </DashboardPage>
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
