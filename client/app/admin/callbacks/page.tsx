"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Phone } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard } from "../ui"

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

// The web Callbacks page: customers outside dispatch coverage who asked for a
// call, with Call and status.
export default function AdminCallbacksScreen() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ data: CallbackRequest[] }>({
    queryKey: ["admin-callbacks"],
    queryFn: () => api.get<{ data: CallbackRequest[] }>("/admin/callback_requests").then((r) => r.data),
  })
  const rows = data?.data ?? []
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/callback_requests/${id}`, { callback_request: { status } }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-callbacks"] })
      toast({ title: "Callback status saved", variant: "success" })
    },
    onError: (e) => toast({ title: "Callback status not saved", description: apiError(e, "Could not update this callback request."), variant: "error" }),
  })

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Callbacks" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Customers outside dispatch coverage who need a follow-up call.</p>
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading callback requests…</p>
        ) : rows.length === 0 ? (
          <EmptyCard title="No callback requests" body="Out-of-area customer requests will appear here for follow-up." />
        ) : (
          rows.map((r) => {
            const name =
              r.contact_name || (r.user && [r.user.first_name, r.user.last_name].filter(Boolean).join(" ")) || r.user?.email || "Customer"
            const phone = r.contact_phone || r.user?.phone
            return (
              <section key={r.id} className={`${cardClass} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold">{name}</span>
                  <StatusBadgeFor status={r.status} />
                </div>
                <p className={`text-sm ${mutedClass}`}>
                  {r.postal_code ?? "-"}
                  {phone ? ` / ${phone}` : " / no phone"}
                  {r.service ? ` / ${r.service.name}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Status"
                    disabled={update.isPending}
                    value={r.status}
                    onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}
                    className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold capitalize outline-none focus:border-[#C96C83]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {phone ? (
                    <a href={`tel:${phone}`} className="flex h-10 items-center gap-1.5 rounded-xl bg-[#14100F] px-4 text-sm font-bold text-white">
                      <Phone className="size-4" aria-hidden /> Call
                    </a>
                  ) : null}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
