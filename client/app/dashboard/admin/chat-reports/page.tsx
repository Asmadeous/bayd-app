"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Flag } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { ChatPhoto } from "@/components/chat/chat-photos"
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
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useChatReport,
  useChatReports,
  useSetChatReportStatus,
  type ChatReport,
  type ChatReportPerson,
} from "@/lib/hooks/use-chat-reports"

type Filter = "open" | "reviewed" | "all"

const ROLE_LABEL: Record<string, string> = { customer: "Client", employee: "Technician", partner: "Partner", admin: "Admin" }

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function Person({ person }: { person: ChatReportPerson }) {
  return (
    <span>
      <span className="font-bold text-[#101217]">{person.name}</span>{" "}
      <span className="text-[#5f6268]">
        ({ROLE_LABEL[person.role] ?? person.role}
        {person.email ? `, ${person.email}` : ""})
      </span>
    </span>
  )
}

export default function AdminChatReportsPage() {
  return (
    <Suspense>
      <ChatReportsScreen />
    </Suspense>
  )
}

// Reports from the apps' chat. The Terms promise a review within 24 hours, so
// open reports lead and the sidebar shows how many are waiting.
function ChatReportsScreen() {
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<Filter>("open")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(searchParams.get("id")) || null)
  const { data, isLoading } = useChatReports({ status: filter === "all" ? undefined : filter, page })
  const reports = data?.data ?? []
  const pagination = data?.pagination

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Chat reports"
        subtitle={
          data?.open_count
            ? `${data.open_count} waiting for review. Reports should be reviewed within 24 hours.`
            : "No reports waiting. Reports from the apps' chat appear here."
        }
      />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {(["open", "reviewed", "all"] as const).map((item) => (
              <SegmentButton
                active={filter === item}
                key={item}
                onClick={() => {
                  setFilter(item)
                  setPage(1)
                }}
              >
                {item}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading reports...</p>
        </DashboardPanel>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="Reports matching this filter will appear here." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onOpen={() => setSelectedId(report.id)} />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} size="sm" variant="outline">
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {pagination.total_pages}
            </span>
            <Button disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)} size="sm" variant="outline">
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <ReportSheet reportId={selectedId} onClose={() => setSelectedId(null)} />
    </DashboardPage>
  )
}

function ReportRow({ report, onOpen }: { report: ChatReport; onOpen: () => void }) {
  return (
    <DashboardPanel>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-[#101217]">{report.reason}</span>
          <StatusBadge tone={report.status === "open" ? "gold" : "green"}>
            {report.status === "open" ? "Open" : "Reviewed"}
          </StatusBadge>
          <span className="ml-auto text-xs font-semibold text-[#5f6268]">{formatWhen(report.created_at)}</span>
        </div>
        <p className="mt-2 text-sm text-[#5f6268]">
          <Person person={report.reporter} /> reported <Person person={report.reported_user} />
        </p>
        {report.details ? <p className="mt-2 line-clamp-2 text-sm text-[#101217]">&ldquo;{report.details}&rdquo;</p> : null}
      </button>
    </DashboardPanel>
  )
}

function ReportSheet({ reportId, onClose }: { reportId: number | null; onClose: () => void }) {
  const { toast } = useToast()
  const { data: report, isLoading } = useChatReport(reportId)
  const setStatus = useSetChatReportStatus()

  function update(status: "open" | "reviewed") {
    if (!report) return
    setStatus.mutate(
      { id: report.id, status },
      {
        onSuccess: () => toast({ title: status === "reviewed" ? "Marked reviewed" : "Reopened", variant: "success" }),
        onError: () => toast({ title: "Couldn't update the report", variant: "error" }),
      },
    )
  }

  return (
    <Sheet open={reportId != null} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
      <SheetContent>
        <SheetHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Chat report</p>
          <SheetTitle className="text-xl font-extrabold leading-tight text-[#101217]">
            {report?.reason ?? "Loading..."}
          </SheetTitle>
          <SheetDescription className="text-sm leading-6 text-[#5f6268]">
            {report ? `Reported ${formatWhen(report.created_at)}` : ""}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !report ? null : (
          <SheetBody className="space-y-5">
            <dl className="divide-y divide-black/8 border border-black/8 text-sm">
              <Row label="Reported">
                <Person person={report.reported_user} />
                {report.reports_against_user > 1 ? (
                  <span className="ml-1 font-bold text-[#8f3f4b]">({report.reports_against_user} reports in total)</span>
                ) : null}
              </Row>
              <Row label="Reported by">
                <Person person={report.reporter} />
              </Row>
              <Row label="Details">{report.details || "-"}</Row>
              <Row label="Status">
                {report.status === "reviewed" && report.reviewed_by
                  ? `Reviewed by ${report.reviewed_by.name}${report.reviewed_at ? ` on ${formatWhen(report.reviewed_at)}` : ""}`
                  : "Open"}
              </Row>
            </dl>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Conversation</p>
              <div className="max-h-[45vh] space-y-2 overflow-y-auto border border-black/8 bg-[#fbfaf7] p-3">
                {report.messages.length === 0 ? (
                  <p className="text-sm text-[#5f6268]">No messages in this conversation.</p>
                ) : (
                  report.messages.map((m) => {
                    const fromReported = m.sender_id === report.reported_user.id
                    return (
                      <div key={m.id} className={`flex ${fromReported ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            fromReported ? "bg-[#8f3f4b]/10 text-[#101217]" : "bg-white text-[#101217]"
                          }`}
                        >
                          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5f6268]">
                            {fromReported ? report.reported_user.name : report.reporter.name} · {formatWhen(m.created_at)}
                          </p>
                          {m.image_url && <ChatPhoto url={m.image_url} />}
                          {m.body}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <p className="text-xs leading-5 text-[#5f6268]">
              To close the account of someone who broke the rules, find them under Customers or Employees.
            </p>

            {report.status === "open" ? (
              <Button className="h-10 w-full" disabled={setStatus.isPending} onClick={() => update("reviewed")}>
                Mark reviewed
              </Button>
            ) : (
              <Button className="h-10 w-full" disabled={setStatus.isPending} onClick={() => update("open")} variant="outline">
                Reopen
              </Button>
            )}
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 bg-white px-3 py-3 sm:grid-cols-[110px_1fr]">
      <dt className="text-xs font-bold text-[#5f6268]">{label}</dt>
      <dd className="break-words text-[#101217]">{children}</dd>
    </div>
  )
}
