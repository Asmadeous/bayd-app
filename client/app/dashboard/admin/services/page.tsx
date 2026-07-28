"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface Service {
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

interface Category { id: number; name: string }

const TIER_FIELDS: { key: "kids" | "elderly" | "group"; label: string }[] = [
  { key: "kids", label: "Kids ($)" },
  { key: "elderly", label: "Elderly ($)" },
  { key: "group", label: "Group of 5 ($)" },
]

const BLANK = {
  name: "", description: "", duration_minutes: 60, price: "", active: true, image_url: "", service_category_id: "",
  prices: { kids: "", elderly: "", group: "" } as Record<"kids" | "elderly" | "group", string>,
}

export default function AdminServicesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ data: Service[] }>("/admin/services").then((r) => r.data),
  })
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-service-categories"],
    queryFn: () => api.get<Category[]>("/admin/service_categories").then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post("/admin/services", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-services"] }); setModal(null); setForm(BLANK) },
  })
  const updateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/services/${id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-services"] }); setModal(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
  })

  const services = servicesData?.data ?? []

  function openEdit(s: Service) {
    const tp = s.tier_prices ?? {}
    setForm({
      name: s.name, description: s.description ?? "", duration_minutes: s.duration_minutes, price: s.price,
      active: s.active, image_url: s.image_url ?? "", service_category_id: String(s.service_category?.id ?? ""),
      prices: {
        kids: tp.kids != null ? String(tp.kids) : "",
        elderly: tp.elderly != null ? String(tp.elderly) : "",
        group: tp.group != null ? String(tp.group) : "",
      },
    })
    setModal(s.id)
  }

  function openCreate() { setForm(BLANK); setModal("create") }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Services" subtitle="Manage your beauty service catalog"
        actions={<Button size="sm" onClick={openCreate} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Service</Button>}
      />

      {modal !== null && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">{modal === "create" ? "New Service" : "Edit Service"}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[["name", "Name", "text"], ["price", "Price ($)", "number"], ["duration_minutes", "Duration (min)", "number"], ["image_url", "Image URL", "url"]].map(([field, label, type]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[#5f6268] mb-1">{label}</label>
                <input type={type} value={(form as Record<string, unknown>)[field] as string} onChange={(e) => setForm((f) => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Category</label>
              <select value={form.service_category_id} onChange={(e) => setForm((f) => ({ ...f, service_category_id: e.target.value }))}
                className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]">
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-[#c96c83]" id="svc-active" />
              <label htmlFor="svc-active" className="text-sm text-[#101217]">Active</label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#5f6268] mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 resize-none" />
          </div>

          {/* Client-type price tiers — base "Price" above is the Adult price. */}
          <div>
            <p className="text-xs font-semibold text-[#101217] mb-2">Price tiers <span className="font-normal text-[#8a8d93]">(leave blank to use the base price)</span></p>
            <div className="grid grid-cols-3 gap-4">
              {TIER_FIELDS.map((t) => (
                <div key={t.key}>
                  <label className="block text-xs font-medium text-[#5f6268] mb-1">{t.label}</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.prices[t.key]}
                    onChange={(e) => setForm((f) => ({ ...f, prices: { ...f.prices, [t.key]: e.target.value } }))}
                    placeholder={form.price || "—"}
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                  />
                </div>
              ))}
            </div>
          </div>
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
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-black/4 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#101217]">{s.name}</td>
                  <td className="px-4 py-3 text-[#5f6268]">{s.service_category?.name}</td>
                  <td className="px-4 py-3 text-[#101217]">
                    ${s.price}
                    {s.tier_prices && Object.keys(s.tier_prices).length > 0 && (
                      <span className="block text-[10px] text-[#8a8d93]">
                        {TIER_FIELDS.filter((t) => s.tier_prices?.[t.key] != null)
                          .map((t) => `${t.key}: $${s.tier_prices?.[t.key]}`)
                          .join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5f6268]">{s.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={s.active ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#8a8d9322", color: "#8a8d93" }}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button size="xs" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id) }}>Delete</Button>
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
