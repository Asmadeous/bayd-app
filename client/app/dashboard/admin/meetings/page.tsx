"use client"

import { useEffect, useState } from "react"
import { Trash2, Video } from "lucide-react"

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
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
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
import { useAdminMeetings, useDeleteMeeting } from "@/lib/hooks/use-meetings"
import { adminMeetingsSteps } from "@/lib/tours/admin-meetings-tour"

const STATUSES = ["scheduled", "completed", "cancelled"]
const dt = (s: string | null) =>
  formatDate(s)

export default function AdminMeetingsPage() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isError, isLoading } = useAdminMeetings({ status: status || undefined, page })
  const del = useDeleteMeeting()
  const meetings = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Work-scope calls not loaded",
        description: "Could not load work-scope calls. Try refreshing the page.",
        variant: "error",
      })
    }
  }, [isError, toast])

  function selectStatus(nextStatus: string) {
    setStatus(nextStatus)
    setPage(1)
  }

  function deleteMeeting(id: number) {
    del.mutate(id, {
      onSuccess: () => toast({ title: "Work-scope call deleted", variant: "success" }),
      onError: (error: unknown) => {
        toast({
          title: "Work-scope call not deleted",
          description: getApiErrorMessage(error, "Could not delete this work-scope call."),
          variant: "error",
        })
      },
    })
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
                  {isValidUrl(meeting.url) ? (
                    <a href={meeting.url} target="_blank" rel="noopener noreferrer">
                      <Button size="xs" variant="outline">
                        <Video aria-hidden="true" className="size-3.5" />
                        Open room
                      </Button>
                    </a>
                  ) : (
                    <Button size="xs" variant="outline">
                      <Video aria-hidden="true" className="size-3.5" />
                      No room
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={del.isPending}
                        size="xs"
                        variant="outline"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5 text-[#d4754a]" />
                        <span className="sr-only">Delete work-scope call</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete work-scope call?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the call record for booking #{meeting.booking_id}. The linked booking remains unchanged.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMeeting(meeting.id)}>
                          Delete call
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-CA", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

function isValidUrl(value: string | null | undefined) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
