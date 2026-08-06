"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"

interface Product {
  id: number
  name: string
  description: string | null
  price: string
  stock_qty: number
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
  stock_qty: 0,
  active: true,
  image_url: "",
  product_category_id: "",
}

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)

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
    },
  })
  const updateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/products/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] })
      setModal(null)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  })

  const products = productsData?.data ?? []
  const activeCount = products.filter((product) => product.active).length
  const lowStockCount = products.filter((product) => product.stock_qty <= 5).length

  function openCreate() {
    setForm(BLANK)
    setModal("create")
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      stock_qty: product.stock_qty,
      active: product.active,
      image_url: product.image_url ?? "",
      product_category_id: String(product.product_category?.id ?? ""),
    })
    setModal(product.id)
  }

  function saveProduct() {
    if (modal === "create") {
      createMutation.mutate()
    } else if (typeof modal === "number") {
      updateMutation.mutate(modal)
    }
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        actions={
          <Button
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

      {modal !== null ? (
        <DashboardPanel>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Shop editor
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#101217]">
                {modal === "create" ? "New Product" : "Edit Product"}
              </h2>
            </div>
            <StatusBadgeFor status={form.active ? "active" : "inactive"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Name">
              <input
                className={inputClass}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                type="text"
                value={form.name}
              />
            </Field>
            <Field label="Price ($)">
              <input
                className={inputClass}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                type="number"
                value={form.price}
              />
            </Field>
            <Field label="Stock">
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((current) => ({ ...current, stock_qty: Number(event.target.value) }))
                }
                type="number"
                value={form.stock_qty}
              />
            </Field>
            <Field label="Category">
              <Select
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, product_category_id: value ?? "" }))
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
            <Field label="Image URL">
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((current) => ({ ...current, image_url: event.target.value }))
                }
                type="url"
                value={form.image_url}
              />
            </Field>
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217] md:mt-6">
              <input
                checked={form.active}
                className="accent-[#c96c83]"
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
                type="checkbox"
              />
              Active
            </label>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <textarea
                className="min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={saveProduct}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {modal === "create" ? "Create" : "Save"}
            </Button>
            <Button onClick={() => setModal(null)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <DataTableCell>{product.stock_qty}</DataTableCell>
                <DataTableCell>
                  <StatusBadgeFor status={product.active ? "active" : "inactive"} />
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => openEdit(product)} size="xs" variant="outline">
                      Edit
                    </Button>
                    <Button
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id)
                      }}
                      size="xs"
                      variant="destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DashboardPage>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}
