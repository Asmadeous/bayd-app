"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Inbox } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge, StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface BookingRequest {
  id: number
  status: string
  request_type: string
  preferred_at: string | null
  created_at: string
  user: { first_name: string | null; last_name: string | null; email: string }
  service: { name: string }
  service_area: { name: string }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

const STATUSES = ["pending", "assigned", "failed"]

export default function AdminBookingRequestsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<BookingRequest>>({
    queryKey: ["admin-booking-requests", page, status],
    queryFn: () =>
      api
        .get<PagedResponse<BookingRequest>>("/admin/booking_requests", {
          params: { page, status: status || undefined },
        })
        .then((response) => response.data),
  })

  const requests = data?.data ?? []

  function selectStatus(nextStatus: string) {
    setStatus(nextStatus)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Booking Requests"
        subtitle="Review incoming service requests and assignment outcomes."
      />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {["", ...STATUSES].map((requestStatus) => (
              <SegmentButton
                active={status === requestStatus}
                key={requestStatus || "all"}
                onClick={() => selectStatus(requestStatus)}
              >
                {requestStatus || "All"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {requests.length} visible requests
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading booking requests...</p>
        </DashboardPanel>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests found"
          description="Try another status filter or check back when new booking requests arrive."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const name =
              [request.user?.first_name, request.user?.last_name].filter(Boolean).join(" ") ||
              request.user?.email

            return (
              <DashboardPanel className="p-0" key={request.id}>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-[#101217]">
                        {request.service?.name}
                      </h2>
                      <StatusBadgeFor status={request.status} />
                      <StatusBadge>{request.request_type}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                      {name} / {request.service_area?.name}
                      {request.preferred_at
                        ? ` / ${new Date(request.preferred_at).toLocaleString("en-CA")}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#5f6268]">
                    {new Date(request.created_at).toLocaleDateString("en-CA")}
                  </span>
                </div>
              </DashboardPanel>
            )
          })}
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
    </DashboardPage>
  )
}
