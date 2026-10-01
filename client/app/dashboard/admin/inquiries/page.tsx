"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Inbox, Mail } from "lucide-react"

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
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useAdminInquiries } from "@/lib/hooks/use-admin"
import { adminInquiriesSteps } from "@/lib/tours/admin-inquiries-tour"

type InquiryType = "franchise" | "jobs" | "contacts"

// Status keys per inquiry type (the Rails enum keys), with the label admins see.
const STATUSES: Record<InquiryType, { value: string; label: string }[]> = {
  contacts: [
    { value: "unread", label: "New" },
    { value: "read", label: "Read" },
    { value: "replied", label: "Replied" },
  ],
  franchise: [
    { value: "unread", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "closed", label: "Closed" },
  ],
  jobs: [
    { value: "unread", label: "New" },
    { value: "reviewing", label: "Reviewing" },
    { value: "rejected", label: "Rejected" },
    { value: "hired", label: "Hired" },
  ],
}

function InquiryStatus({ type, id, status }: { type: InquiryType; id: number; status: string }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const update = useMutation({
    mutationFn: (next: string) => api.patch(`/admin/inquiries/${type}/${id}`, { status: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
    onError: () => toast({ title: "Status not saved", variant: "error" }),
  })

  return (
    <select
      aria-label="Status"
      value={status}
      disabled={update.isPending}
      onChange={(e) => update.mutate(e.target.value)}
      className="h-8 border border-black/15 bg-white px-2 text-xs font-semibold text-[#101217] focus:border-[#c96c83] focus:outline-none"
    >
      {STATUSES[type].map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}

export default function AdminInquiriesPage() {
  const [type, setType] = useState<InquiryType>("contacts")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminInquiries(type, page)
  const items = data?.data ?? []
  const pagination = data?.pagination

  function selectType(nextType: InquiryType) {
    setType(nextType)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-inquiries-header">
        <DashboardHeader
          title="Inquiries"
          subtitle="Review incoming contact, franchise, and job inquiries."
        />
      </div>

      <DashboardToolbar data-tour="admin-inquiries-tabs">
        <ToolbarSection>
          <SegmentedControl>
            {(["contacts", "franchise", "jobs"] as const).map((item) => (
              <SegmentButton active={type === item} key={item} onClick={() => selectType(item)}>
                {item}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading inquiries...</p>
        </DashboardPanel>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`No ${type} inquiries`}
          description="New inquiry submissions will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-inquiries-list">
          {items.map((item, index) => (
            <DashboardPanel key={typeof item.id === "number" ? item.id : index}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(item)
                  .filter(([key]) => !["id", "created_at", "updated_at", "status"].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="mt-1 block break-words text-sm font-semibold text-[#101217]">
                        {String(value ?? "-")}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/8 pt-3">
                {typeof item.created_at === "string" ? (
                  <p className="text-xs font-semibold text-[#5f6268]">{new Date(item.created_at).toLocaleDateString("en-CA")}</p>
                ) : null}
                {typeof item.email === "string" && item.email ? (
                  <a
                    href={`mailto:${item.email}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#c96c83] hover:underline"
                  >
                    <Mail className="size-3.5" /> Reply by email
                  </a>
                ) : null}
                {typeof item.id === "number" && typeof item.status === "string" ? (
                  <span className="ml-auto">
                    <InquiryStatus type={type} id={item.id} status={item.status} />
                  </span>
                ) : null}
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
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
              {page} / {pagination.total_pages}
            </span>
            <Button
              disabled={!pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={adminInquiriesSteps} pageKey="admin-inquiries" />
    </DashboardPage>
  )
}
