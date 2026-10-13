"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard } from "../ui"

interface TipOwed {
  employee_profile_id: number
  technician: string | null
  amount_owed: string | number
}

// The web Tips page: card tips collected for each technician, and Mark paid out.
export default function AdminTipsScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ data: TipOwed[] }>({
    queryKey: ["admin-tips"],
    queryFn: () => api.get<{ data: TipOwed[] }>("/admin/tips").then((r) => r.data),
  })
  const rows = data?.data ?? []
  const payout = useMutation({
    mutationFn: (employee_profile_id: number) => api.post("/admin/tips/payout", { employee_profile_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tips"] })
      toast({ title: "Tips marked paid out", variant: "success" })
    },
    onError: (e) => toast({ title: "Tips not marked paid", description: apiError(e, "Could not mark these tips paid out."), variant: "error" }),
  })

  async function markPaid(row: TipOwed) {
    const who = row.technician ?? `technician #${row.employee_profile_id}`
    const ok = await confirm({
      title: "Mark tips paid out?",
      message: `This records ${who} as paid for ${formatMoney(Number(row.amount_owed))} in outstanding tips.`,
      confirmLabel: "Mark paid out",
    })
    if (ok) payout.mutate(row.employee_profile_id)
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Tips" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Card tips collected on the customer&apos;s behalf and owed to each technician.</p>
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading tips…</p>
        ) : rows.length === 0 ? (
          <EmptyCard title="No tips owed" body="Outstanding technician tips will appear here." />
        ) : (
          rows.map((row) => (
            <section key={row.employee_profile_id} className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{row.technician ?? `#${row.employee_profile_id}`}</p>
                <p className="text-xl font-black">{formatMoney(Number(row.amount_owed))}</p>
              </div>
              <button
                type="button"
                disabled={payout.isPending}
                onClick={() => markPaid(row)}
                className="h-10 shrink-0 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40"
              >
                Mark paid out
              </button>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
