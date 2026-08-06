"use client"

import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { useAdminInquiries } from "@/lib/hooks/use-admin"

type InquiryType = "franchise" | "jobs" | "contacts"

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
      <DashboardHeader
        title="Inquiries"
        subtitle="Review incoming contact, franchise, and job inquiries."
      />

      <DashboardToolbar>
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
        <div className="space-y-3">
          {items.map((item, index) => (
            <DashboardPanel key={index}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(item)
                  .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
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
              {typeof item.created_at === "string" ? (
                <p className="mt-4 border-t border-black/8 pt-3 text-xs font-semibold text-[#5f6268]">
                  {new Date(item.created_at).toLocaleDateString("en-CA")}
                </p>
              ) : null}
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
    </DashboardPage>
  )
}
