"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail } from "lucide-react"

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
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { adminNewsletterSteps } from "@/lib/tours/admin-newsletter-tour"

interface Subscriber { id: number; email: string; confirmed: boolean; created_at: string }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

export default function AdminNewsletterPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<PagedResponse<Subscriber>>({
    queryKey: ["admin-newsletter", page],
    queryFn: () =>
      api
        .get<PagedResponse<Subscriber>>("/admin/newsletter_subscribers", { params: { page } })
        .then((response) => response.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/newsletter_subscribers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-newsletter"] }),
  })

  const subscribers = data?.data ?? []

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-newsletter-header">
        <DashboardHeader title="Newsletter" subtitle="Manage newsletter subscribers." />
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-tour="admin-newsletter-metrics">
        <MetricCard
          accent
          icon={Mail}
          label="Total Subscribers"
          value={data?.pagination?.total_count ?? "-"}
        />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading subscribers...</p>
        </DashboardPanel>
      ) : subscribers.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No subscribers yet"
          description="Newsletter subscribers will appear here."
        />
      ) : (
        <div data-tour="admin-newsletter-table">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Confirmed</DataTableHeaderCell>
              <DataTableHeaderCell>Subscribed</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {subscribers.map((subscriber) => (
              <DataTableRow key={subscriber.id}>
                <DataTableCell className="font-semibold text-[#101217]">{subscriber.email}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={subscriber.confirmed ? "green" : "gold"}>
                    {subscriber.confirmed ? "Yes" : "Pending"}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell className="text-xs">
                  {new Date(subscriber.created_at).toLocaleDateString("en-CA")}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <Button
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("Unsubscribe this email?")) deleteMutation.mutate(subscriber.id)
                      }}
                      size="xs"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
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

      <TutorialButton steps={adminNewsletterSteps} pageKey="admin-newsletter" />
    </DashboardPage>
  )
}
