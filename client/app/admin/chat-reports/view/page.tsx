"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { ChatPhoto } from "@/components/chat/chat-photos"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDateTime } from "@/lib/booking-time"
import { useChatReport, useSetChatReportStatus } from "@/lib/hooks/use-chat-reports"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../../admin-theme"
import { Person } from "../person"

export default function AdminChatReportScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <ChatReport />
    </Suspense>
  )
}

// One report: who reported whom, the details, the whole conversation, and
// Mark reviewed / Reopen.
function ChatReport() {
  const id = Number(useSearchParams().get("id")) || null
  const { toast } = useToast()
  const { data: report, isLoading } = useChatReport(id)
  const setStatus = useSetChatReportStatus()

  if (isLoading || !report) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Chat report" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Report not found."}</p>
      </div>
    )
  }

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
    <div className={adminScreenClass}>
      <AdminHeader back title="Chat report" />
      <div className="space-y-4 px-5">
        <section className={`${cardClass} space-y-3 p-5`}>
          <div>
            <p className={`${displayClass} text-xl`}>{report.reason}</p>
            <p className={`text-sm ${mutedClass}`}>Reported {formatBookingDateTime(report.created_at)}</p>
          </div>
          <Row label="Reported">
            <Person person={report.reported_user} />
            {report.reports_against_user > 1 ? <span className="ml-1 font-bold text-[#8f3f4b]">({report.reports_against_user} reports in total)</span> : null}
          </Row>
          <Row label="Reported by">
            <Person person={report.reporter} />
          </Row>
          <Row label="Details">{report.details || "-"}</Row>
          <Row label="Status">
            {report.status === "reviewed" && report.reviewed_by
              ? `Reviewed by ${report.reviewed_by.name}${report.reviewed_at ? ` on ${formatBookingDateTime(report.reviewed_at)}` : ""}`
              : "Open"}
          </Row>
        </section>

        <section className={`${cardClass} p-4`}>
          <p className={`${eyebrowClass} mb-3`}>Conversation</p>
          <div className="space-y-2">
            {report.messages.length === 0 ? (
              <p className={`text-sm ${mutedClass}`}>No messages in this conversation.</p>
            ) : (
              report.messages.map((m) => {
                const fromReported = m.sender_id === report.reported_user.id
                return (
                  <div key={m.id} className={`flex ${fromReported ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${fromReported ? "bg-[#8f3f4b]/10" : "bg-[#F4F2EF]"}`}>
                      <p className={`mb-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${mutedClass}`}>
                        {fromReported ? report.reported_user.name : report.reporter.name} · {formatBookingDateTime(m.created_at)}
                      </p>
                      {m.image_url ? <ChatPhoto url={m.image_url} /> : null}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <p className={`text-sm ${mutedClass}`}>To close the account of someone who broke the rules, find them under Customers or Employees.</p>

        {report.status === "open" ? (
          <button
            type="button"
            disabled={setStatus.isPending}
            onClick={() => update("reviewed")}
            className="h-12 w-full rounded-xl bg-[#14100F] text-base font-bold text-white disabled:opacity-40"
          >
            Mark reviewed
          </button>
        ) : (
          <button
            type="button"
            disabled={setStatus.isPending}
            onClick={() => update("open")}
            className="h-12 w-full rounded-xl border border-black/10 bg-white text-base font-bold disabled:opacity-40"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={eyebrowClass}>{label}</p>
      <div className="mt-0.5 break-words text-sm">{children}</div>
    </div>
  )
}
