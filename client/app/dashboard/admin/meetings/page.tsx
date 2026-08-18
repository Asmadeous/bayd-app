"use client"

import { useState } from "react"
import { Trash2, Video } from "lucide-react"

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
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useAdminMeetings, useDeleteMeeting } from "@/lib/hooks/use-meetings"
import { adminMeetingsSteps } from "@/lib/tours/admin-meetings-tour"

const STATUSES = ["scheduled", "completed", "cancelled"]
const dt = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-CA", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })
    : "-"

export default function AdminMeetingsPage() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminMeetings({ status: status || undefined, page })
  const del = useDeleteMeeting()
  const meetings = data?.data ?? []

  function selectStatus(nextStatus: string) {
    setStatus(nextStatus)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-meetings-header">
        <DashboardHeader
          title="Work-Scope Calls"
          subtitle="Video consultations between customers and staff."
        />
      </div>

      <DashboardToolbar data-tour="admin-meetings-filters">
        <ToolbarSection>
          <SegmentedControl>
            {["", ...STATUSES].map((meetingStatus) => (
              <SegmentButton
                active={status === meetingStatus}
                key={meetingStatus || "all"}
                onClick={() => selectStatus(meetingStatus)}
              >
                {meetingStatus || "All"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {meetings.length} visible calls
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading work-scope calls...</p>
        </DashboardPanel>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No calls found"
          description="Scheduled consultations will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-meetings-list">
          {meetings.map((meeting) => (
            <DashboardPanel className="p-0" key={meeting.id}>
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center border border-black/10 bg-[#f4f1eb] text-[#c96c83]">
                    <Video aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-[#101217]">
                        Booking #{meeting.booking_id}
                      </h2>
                      <StatusBadgeFor status={meeting.status} />
                    </div>
                    <p className="mt-2 truncate text-sm text-[#5f6268]">
                      scheduled {dt(meeting.scheduled_at)} / {meeting.provider}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <a href={meeting.url} target="_blank" rel="noopener noreferrer">
                    <Button size="xs" variant="outline">
                      <Video aria-hidden="true" className="size-3.5" />
                      Open room
                    </Button>
                  </a>
                  <Button
                    disabled={del.isPending}
                    onClick={() => {
                      if (confirm("Delete this call?")) del.mutate(meeting.id)
                    }}
                    size="xs"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5 text-[#d4754a]" />
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          ))}
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

      <TutorialButton steps={adminMeetingsSteps} pageKey="admin-meetings" />
    </DashboardPage>
  )
}
