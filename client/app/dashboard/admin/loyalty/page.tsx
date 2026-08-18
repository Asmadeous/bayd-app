"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"

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
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { adminLoyaltySteps } from "@/lib/tours/admin-loyalty-tour"

interface LoyaltyAccount {
  id: number
  points_balance: number
  created_at: string
  user: { email: string; first_name: string | null; last_name: string | null }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number }
}

export default function AdminLoyaltyPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<LoyaltyAccount>>({
    queryKey: ["admin-loyalty", page],
    queryFn: () =>
      api
        .get<PagedResponse<LoyaltyAccount>>("/admin/loyalty", { params: { page } })
        .then((response) => response.data),
  })

  const accounts = data?.data ?? []
  const totalPoints = accounts.reduce((sum, account) => sum + account.points_balance, 0)

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-loyalty-header">
        <DashboardHeader title="Loyalty Program" subtitle="Review customer points balances." />
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-tour="admin-loyalty-metrics">
        <MetricCard icon={Star} label="Total Accounts" value={data?.pagination?.total_count ?? "-"} />
        <MetricCard accent icon={Star} label="Points Outstanding" value={totalPoints.toLocaleString()} />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading loyalty accounts...</p>
        </DashboardPanel>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No loyalty accounts yet"
          description="Customer loyalty accounts will appear here."
        />
      ) : (
        <div data-tour="admin-loyalty-table">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Customer</DataTableHeaderCell>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Points Balance</DataTableHeaderCell>
              <DataTableHeaderCell>Member Since</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {accounts.map((account) => {
              const name =
                [account.user?.first_name, account.user?.last_name].filter(Boolean).join(" ") || "-"
              return (
                <DataTableRow key={account.id}>
                  <DataTableCell className="font-bold text-[#101217]">{name}</DataTableCell>
                  <DataTableCell>{account.user?.email}</DataTableCell>
                  <DataTableCell className="font-extrabold text-[#c96c83]">
                    {account.points_balance.toLocaleString()} pts
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    {new Date(account.created_at).toLocaleDateString("en-CA")}
                  </DataTableCell>
                </DataTableRow>
              )
            })}
          </DataTableBody>
        </DataTable>
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={adminLoyaltySteps} pageKey="admin-loyalty" />
    </DashboardPage>
  )
}
