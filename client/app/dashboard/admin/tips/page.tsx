"use client"

import { useEffect } from "react"
import { HandCoins } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useToast } from "@/components/bayd-toast-provider"
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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { adminTipsSteps } from "@/lib/tours/admin-tips-tour"

interface TipOwed {
  employee_profile_id: number
  technician: string | null
  amount_owed: string | number
}

export default function AdminTipsPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery<{ data: TipOwed[] }>({
    queryKey: ["admin-tips"],
    queryFn: () => api.get<{ data: TipOwed[] }>("/admin/tips").then((r) => r.data),
  })
  const rows = data?.data ?? []

  const payout = useMutation({
    mutationFn: (employee_profile_id: number) =>
      api.post("/admin/tips/payout", { employee_profile_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tips"] })
      toast({ title: "Tips marked paid out", variant: "success" })
    },
    onError: (error: unknown) => {
      toast({
        title: "Tips not marked paid",
        description: getApiErrorMessage(error, "Could not mark these tips paid out."),
        variant: "error",
      })
    },
  })

  useEffect(() => {
    if (isError) {
      toast({
        title: "Tips not loaded",
        description: "Could not load technician tips owed.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-tips-header">
        <DashboardHeader
          title="Tips Owed"
          subtitle="Card tips collected on the customer's behalf and owed to each technician."
        />
      </div>

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
        <div data-tour="admin-tips-list">
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
                    {formatCurrency(row.amount_owed)}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={payout.isPending}
                            size="xs"
                            variant="outline"
                          >
                            Mark paid out
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark tips paid out?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This records {row.technician ?? `technician #${row.employee_profile_id}`} as paid for {formatCurrency(row.amount_owed)} in outstanding tips.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => payout.mutate(row.employee_profile_id)}>
                              Mark paid out
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      <TutorialButton steps={adminTipsSteps} pageKey="admin-tips" />
    </DashboardPage>
  )
}

function formatCurrency(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
