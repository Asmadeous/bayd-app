"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface CallbackRequest {
  id: number
  postal_code: string | null
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
  status: string
  created_at: string
  user?: { email: string; first_name: string | null; last_name: string | null; phone: string | null }
  service?: { name: string }
}

const STATUSES = ["new", "contacted", "booked", "declined"]

export default function AdminCallbacksPage() {
  const qc = useQueryClient()
  const { data } = useQuery<{ data: CallbackRequest[] }>({
    queryKey: ["admin-callbacks"],
    queryFn: () => api.get<{ data: CallbackRequest[] }>("/admin/callback_requests").then((r) => r.data),
  })
  const rows = data?.data ?? []

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/callback_requests/${id}`, { callback_request: { status } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-callbacks"] }),
  })

  return (
    <div className="space-y-6">
      <DashboardHeader title="Out-of-area callbacks" subtitle="Customers with no covering technician — call back to check for someone nearby" />

      <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[#5f6268]">No callback requests.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {rows.map((r) => {
              const name = r.contact_name || (r.user && `${r.user.first_name ?? ""} ${r.user.last_name ?? ""}`.trim())
              const phone = r.contact_phone || r.user?.phone
              return (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="text-sm">
                    <p className="text-[#101217] font-medium">
                      {name || r.user?.email || "Customer"} · {r.postal_code ?? "—"}
                    </p>
                    <p className="text-[#5f6268]">
                      {phone ?? "no phone"}{r.service ? ` · ${r.service.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}
                      className="h-9 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {phone && (
                      <a href={`tel:${phone}`}>
                        <Button size="xs" variant="outline">Call</Button>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
