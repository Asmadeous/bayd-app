"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Inbox } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { adminBookingRequestsSteps } from "@/lib/tours/admin-booking-requests-tour"

type BookingRequestStatus = "pending" | "assigned" | "booked" | "no_coverage" | "no_availability" | "failed"

interface BookingRequest {
  id: number
  status: BookingRequestStatus
  kind: string
  requested_start: string | null
  requested_window_end: string | null
  created_at: string
  user: { first_name: string | null; last_name: string | null; email: string }
  service: { name: string }
  address: { line1?: string | null; line2?: string | null; city?: string | null; province?: string | null; postal_code?: string | null } | null
  assigned_employee?: {
    user?: { first_name: string | null; last_name: string | null; email: string }
  } | null
}

interface AssignmentAttempt {
  id: number
  reason: string | null
  candidates: { employee_id?: number; distance_km?: number | null; source?: string | null }[]
  chosen_employee?: {
    user?: { first_name: string | null; last_name: string | null; email: string }
  } | null
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

type BookingRequestDetail = BookingRequest & { assignment_attempts: AssignmentAttempt[] }

const STATUSES: BookingRequestStatus[] = ["pending", "assigned", "booked", "no_coverage", "no_availability", "failed"]

export default function AdminBookingRequestsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BookingRequestStatus | "">("")
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)

  const { data, isError, isLoading } = useQuery<PagedResponse<BookingRequest>>({
    queryKey: ["admin-booking-requests", page, status],
    queryFn: () =>
      api
        .get<PagedResponse<BookingRequest>>("/admin/booking_requests", {
          params: { page, status: status || undefined },
        })
        .then((response) => response.data),
  })
  const {
    data: detail,
    isError: detailIsError,
    isLoading: detailIsLoading,
  } = useQuery<BookingRequestDetail>({
    queryKey: ["admin-booking-request", selectedRequestId],
    queryFn: () => api.get<BookingRequestDetail>(`/admin/booking_requests/${selectedRequestId}`).then((response) => response.data),
    enabled: selectedRequestId !== null,
  })

  const requests = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Booking requests not loaded",
        description: "Could not load booking requests. Try refreshing the page.",
        variant: "error",
      })
    }
  }, [isError, toast])

  useEffect(() => {
    if (detailIsError) {
      toast({
        title: "Request details not loaded",
        description: "Could not load assignment diagnostics for this request.",
        variant: "error",
      })
    }
  }, [detailIsError, toast])

  function selectStatus(nextStatus: BookingRequestStatus | "") {
    setStatus(nextStatus)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="booking-requests-header">
        <DashboardHeader
          title="Booking Requests"
          subtitle="Review incoming service requests and assignment outcomes."
        />
      </div>

      <DashboardToolbar data-tour="booking-requests-filters">
        <ToolbarSection>
          <SegmentedControl>
            {["", ...STATUSES].map((requestStatus) => (
              <SegmentButton
                active={status === requestStatus}
                key={requestStatus || "all"}
                onClick={() => selectStatus(requestStatus as BookingRequestStatus | "")}
              >
                {formatStatus(requestStatus) || "All"}
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
        <div className="space-y-3" data-tour="booking-requests-list">
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
                      <StatusBadge>{formatStatus(request.kind)}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                      {name} / {formatAddress(request.address)}
                      {request.requested_start
                        ? ` / ${new Date(request.requested_start).toLocaleString("en-CA")}`
                        : ""}
                    </p>
                    {request.assigned_employee ? (
                      <p className="mt-1 text-xs font-semibold text-[#5f6268]">
                        Assigned to {employeeName(request.assigned_employee) || "technician"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="text-xs font-semibold text-[#5f6268]">
                      {new Date(request.created_at).toLocaleDateString("en-CA")}
                    </span>
                    <Button size="xs" variant="outline" onClick={() => setSelectedRequestId(request.id)}>
                      Details
                    </Button>
                  </div>
                </div>
              </DashboardPanel>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end" data-tour="booking-requests-pagination">
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

      <Dialog open={selectedRequestId !== null} onOpenChange={(open) => { if (!open) setSelectedRequestId(null) }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Booking request
            </p>
            <DialogTitle>Assignment details</DialogTitle>
            <DialogDescription>
              Review request metadata and assignment attempts for manual follow-up.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {detailIsLoading ? (
              <p className="text-sm text-[#5f6268]">Loading request details...</p>
            ) : detail ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailItem label="Status" value={formatStatus(detail.status)} />
                  <DetailItem label="Type" value={formatStatus(detail.kind)} />
                  <DetailItem label="Requested" value={detail.requested_start ? new Date(detail.requested_start).toLocaleString("en-CA") : "Immediate"} />
                  <DetailItem label="Customer" value={customerName(detail.user)} />
                  <DetailItem label="Service" value={detail.service?.name ?? "-"} />
                  <DetailItem label="Address" value={formatAddress(detail.address)} />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
                    Assignment attempts
                  </p>
                  {detail.assignment_attempts?.length ? (
                    <div className="space-y-2">
                      {detail.assignment_attempts.map((attempt) => (
                        <div key={attempt.id} className="border border-black/10 bg-[#fbfaf7] p-3">
                          <p className="text-sm font-semibold text-[#101217]">
                            {attempt.reason || "Assignment attempted"}
                          </p>
                          <p className="mt-1 text-xs text-[#5f6268]">
                            Chosen: {attempt.chosen_employee ? employeeName(attempt.chosen_employee) || "technician" : "None"}
                          </p>
                          {attempt.candidates?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {attempt.candidates.map((candidate, index) => (
                                <span key={`${attempt.id}-${candidate.employee_id ?? index}`} className="bg-black/5 px-2 py-1 text-[11px] font-semibold text-[#5f6268]">
                                  #{candidate.employee_id ?? "?"}
                                  {candidate.distance_km != null ? ` / ${candidate.distance_km} km` : ""}
                                  {candidate.source ? ` / ${candidate.source}` : ""}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-[#8a8d93]">No eligible candidates were recorded.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8a8d93]">No assignment attempts recorded yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#5f6268]">Select a request to view details.</p>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <TutorialButton steps={adminBookingRequestsSteps} pageKey="admin-booking-requests" />
    </DashboardPage>
  )
}

function customerName(user?: BookingRequest["user"]) {
  if (!user) return "-"
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
}

function employeeName(employee?: BookingRequest["assigned_employee"]) {
  if (!employee?.user) return ""
  return [employee.user.first_name, employee.user.last_name].filter(Boolean).join(" ") || employee.user.email
}

function formatAddress(address: BookingRequest["address"]) {
  if (!address) return "No address"
  return [address.line1, address.line2, address.city, address.province, address.postal_code].filter(Boolean).join(", ") || "No address"
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ")
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 bg-[#fbfaf7] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#101217]">{value}</p>
    </div>
  )
}
