"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface Product { id: number; name: string; description: string | null; price: string; stock_qty: number; active: boolean; image_url: string | null; product_category: { id: number; name: string } }
interface Category { id: number; name: string }

const BLANK = { name: "", description: "", price: "", stock_qty: 0, active: true, image_url: "", product_category_id: "" }

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.get<{ data: Product[] }>("/admin/products").then((r) => r.data),
  })
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-product-categories"],
    queryFn: () => api.get<Category[]>("/admin/product_categories").then((r) => r.data),
  })

  const createMutation = useMutation({ mutationFn: () => api.post("/admin/products", form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); setModal(null); setForm(BLANK) } })
  const updateMutation = useMutation({ mutationFn: (id: number) => api.patch(`/admin/products/${id}`, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); setModal(null) } })
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/admin/products/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }) })

  const products = productsData?.data ?? []

  function openEdit(p: Product) {
    setForm({ name: p.name, description: p.description ?? "", price: p.price, stock_qty: p.stock_qty, active: p.active, image_url: p.image_url ?? "", product_category_id: String(p.product_category?.id ?? "") })
    setModal(p.id)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Products" subtitle="Manage shop products"
        actions={<Button size="sm" onClick={() => { setForm(BLANK); setModal("create") }} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Product</Button>}
      />

      {modal !== null && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "New Product" : "Edit Product"}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[["name", "Name", "text"], ["price", "Price ($)", "number"], ["stock_qty", "Stock Qty", "number"], ["image_url", "Image URL", "url"]].map(([field, label, type]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[#5f6268] mb-1">{label}</label>
                <input type={type} value={(form as Record<string, unknown>)[field] as string} onChange={(e) => setForm((f) => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Category</label>
              <select value={form.product_category_id} onChange={(e) => setForm((f) => ({ ...f, product_category_id: e.target.value }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]">
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-[#c96c83]" id="prod-active" />
              <label htmlFor="prod-active" className="text-sm text-[#101217]">Active</label>
            </div>
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description"
            className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c96c83] resize-none" />
          <div className="flex gap-2">
            <Button size="sm" disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => modal === "create" ? createMutation.mutate() : updateMutation.mutate(modal as number)}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {modal === "create" ? "Create" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : (
        <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-black/4 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#101217]">{p.name}</td>
                  <td className="px-4 py-3 text-[#5f6268]">{p.product_category?.name}</td>
                  <td className="px-4 py-3 text-[#101217]">${p.price}</td>
                  <td className="px-4 py-3 text-[#5f6268]">{p.stock_qty}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={p.active ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#8a8d9322", color: "#8a8d93" }}>{p.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button size="xs" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                      <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id) }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
