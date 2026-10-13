"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { ProductEditorDialog, type AdminProduct, type ProductCategory } from "@/components/dashboard/product-editor"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard } from "../ui"

// The web Products page: shop products with price, stock and status; add,
// edit (the web's own editor) and delete.
export default function AdminProductsScreen() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<"create" | AdminProduct | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.get<{ data: AdminProduct[] }>("/admin/products").then((r) => r.data),
  })
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["admin-product-categories"],
    queryFn: () => api.get<ProductCategory[]>("/admin/product_categories").then((r) => r.data),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e) => toast({ title: "Product not deleted", description: apiError(e, "Could not delete this product."), variant: "error" }),
  })
  const products = data?.data ?? []

  async function remove(p: AdminProduct) {
    const ok = await confirm({
      title: "Delete product?",
      message: `This will remove "${p.name}" from the shop catalog. Customers will no longer be able to buy it.`,
      confirmLabel: "Delete product",
      tone: "danger",
    })
    if (ok) del.mutate(p.id)
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Products"
        action={
          <button type="button" onClick={() => setEditing("create")} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Add
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        {products.length} total · {products.filter((p) => p.active).length} active · {products.filter((p) => p.stock_quantity <= 5).length} low stock
      </p>
      {editing ? <ProductEditorDialog categories={categories} onClose={() => setEditing(null)} product={editing === "create" ? null : editing} /> : null}
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading products…</p>
        ) : products.length === 0 ? (
          <EmptyCard title="No products yet" body="Create the first product for the shop catalog." />
        ) : (
          products.map((p) => (
            <section key={p.id} className={`${cardClass} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold">{p.name}</p>
                  <p className={`text-sm ${mutedClass}`}>{p.product_category?.name}</p>
                </div>
                <StatusBadgeFor status={p.active ? "active" : "inactive"} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-bold">{formatMoney(p.price)}</span>
                <span className={`text-sm font-semibold ${p.stock_quantity <= 5 ? "text-[#8f3f4b]" : mutedClass}`}>{p.stock_quantity} in stock</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setEditing(p)} className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={del.isPending}
                  onClick={() => remove(p)}
                  className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
