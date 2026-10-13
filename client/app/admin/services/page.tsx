"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { ServiceEditorDialog, TIER_FIELDS, type AdminService, type ServiceCategory } from "@/components/dashboard/service-editor"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard } from "../ui"

// The web Services page: the bookable catalog with prices, tiers and status;
// add, edit (the web's own editor) and delete.
export default function AdminServicesScreen() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<"create" | AdminService | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ data: AdminService[] }>("/admin/services").then((r) => r.data),
  })
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["admin-service-categories"],
    queryFn: () => api.get<ServiceCategory[]>("/admin/service_categories").then((r) => r.data),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
    onError: (e) => toast({ title: "Service not deleted", description: apiError(e, "Could not delete this service."), variant: "error" }),
  })
  const services = data?.data ?? []

  async function remove(s: AdminService) {
    const ok = await confirm({
      title: "Delete service?",
      message: `This will remove "${s.name}" from the service catalog. Customers will no longer be able to book it.`,
      confirmLabel: "Delete service",
      tone: "danger",
    })
    if (ok) del.mutate(s.id)
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Services"
        action={
          <button type="button" onClick={() => setEditing("create")} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Add
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        {services.length} total · {services.filter((s) => s.active).length} active
      </p>
      {editing ? <ServiceEditorDialog categories={categories} onClose={() => setEditing(null)} service={editing === "create" ? null : editing} /> : null}
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading services…</p>
        ) : services.length === 0 ? (
          <EmptyCard title="No services yet" body="Create the first service customers can book." />
        ) : (
          services.map((s) => (
            <section key={s.id} className={`${cardClass} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold">{s.name}</p>
                  <p className={`text-sm ${mutedClass}`}>
                    {s.service_category?.name} · {s.duration_minutes} min
                  </p>
                </div>
                <StatusBadgeFor status={s.active ? "active" : "inactive"} />
              </div>
              {s.description ? <p className={`mt-1 line-clamp-2 text-sm ${mutedClass}`}>{s.description}</p> : null}
              <p className="mt-2 text-base font-bold">{formatMoney(s.price)}</p>
              {s.tier_prices && Object.keys(s.tier_prices).length > 0 ? (
                <p className={`text-xs font-semibold ${mutedClass}`}>
                  {TIER_FIELDS.filter((t) => s.tier_prices?.[t.key] != null)
                    .map((t) => `${t.key}: ${formatMoney(s.tier_prices?.[t.key])}`)
                    .join(" / ")}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setEditing(s)} className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={del.isPending}
                  onClick={() => remove(s)}
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
