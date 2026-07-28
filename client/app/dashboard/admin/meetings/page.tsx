"use client"

import { useState } from "react"
import { Video, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useAdminMeetings, useDeleteMeeting } from "@/lib/hooks/use-meetings"

const STATUSES = ["scheduled", "completed", "cancelled"]
const STATUS_COLOR: Record<string, string> = { scheduled: "#c96c83", completed: "#5a9e5a", cancelled: "#8a8d93" }
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

export default function AdminMeetingsPage() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminMeetings({ status: status || undefined, page })
  const del = useDeleteMeeting()
  const meetings = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Work-Scope Calls" subtitle="Video consultations between customers and staff" />

      <div className="flex gap-2">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatus(s); setPage(1) }}
            className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={status === s ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No calls found.</div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const color = STATUS_COLOR[m.status] ?? "#8a8d93"
            return (
              <div key={m.id} className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid place-items-center size-9 rounded-full shrink-0" style={{ background: `${color}22`, color }}>
                    <Video className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#101217]">Booking #{m.booking_id}</p>
                    <p className="text-xs text-[#5f6268] truncate">
                      <span className="capitalize" style={{ color }}>{m.status}</span> · scheduled {dt(m.scheduled_at)} · {m.provider}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    <Button size="xs" variant="outline"><Video className="size-3.5 mr-1" /> Open room</Button>
                  </a>
                  <Button size="xs" variant="outline" disabled={del.isPending}
                    onClick={() => { if (confirm("Delete this call?")) del.mutate(m.id) }}>
                    <Trash2 className="size-3.5 text-[#d4754a]" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
