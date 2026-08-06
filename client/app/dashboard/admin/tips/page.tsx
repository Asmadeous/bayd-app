"use client"

import { HandCoins } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface TipOwed {
  employee_profile_id: number
  technician: string | null
  amount_owed: string | number
}

export default function AdminTipsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ data: TipOwed[] }>({
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
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Tips Owed"
        subtitle="Card tips collected on the customer's behalf and owed to each technician."
      />

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading tips...</p>
        </DashboardPanel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No tips owed"
          description="Outstanding technician tips will appear here."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Technician</DataTableHeaderCell>
              <DataTableHeaderCell>Amount Owed</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.map((row) => (
              <DataTableRow key={row.employee_profile_id}>
                <DataTableCell className="font-bold text-[#101217]">
                  {row.technician ?? `#${row.employee_profile_id}`}
                </DataTableCell>
                <DataTableCell className="font-heading text-xl font-extrabold text-[#101217]">
                  ${Number(row.amount_owed).toFixed(2)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <Button
                      disabled={payout.isPending}
                      onClick={() => payout.mutate(row.employee_profile_id)}
                      size="xs"
                      variant="outline"
                    >
                      Mark paid out
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
