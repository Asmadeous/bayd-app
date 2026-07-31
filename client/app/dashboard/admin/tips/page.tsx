"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface TipOwed {
  employee_profile_id: number
  technician: string | null
  amount_owed: string | number
}

export default function AdminTipsPage() {
  const qc = useQueryClient()
  const { data } = useQuery<{ data: TipOwed[] }>({
    queryKey: ["admin-tips"],
    queryFn: () => api.get<{ data: TipOwed[] }>("/admin/tips").then((r) => r.data),
  })
  const rows = data?.data ?? []

  const payout = useMutation({
    mutationFn: (employee_profile_id: number) =>
      api.post("/admin/tips/payout", { employee_profile_id }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tips"] }),
  })

  return (
    <div className="space-y-6">
      <DashboardHeader title="Tips owed" subtitle="Card tips collected on the customer's behalf, owed to each technician" />

      <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[#5f6268]">No tips are currently owed.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs text-[#5f6268]">
                <th className="px-4 py-3 font-medium">Technician</th>
                <th className="px-4 py-3 font-medium">Amount owed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee_profile_id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-[#101217]">{r.technician ?? `#${r.employee_profile_id}`}</td>
                  <td className="px-4 py-3 text-[#101217]">${Number(r.amount_owed).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="xs" variant="outline"
                      disabled={payout.isPending}
                      onClick={() => payout.mutate(r.employee_profile_id)}
                    >
                      Mark paid out
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
