"use client"

import { useState } from "react"
import { Trash2, Video } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useAdminMeetings, useDeleteMeeting, type Meeting } from "@/lib/hooks/use-meetings"
import { openPaymentUrl } from "@/lib/native/open-external"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"

const STATUSES = ["scheduled", "completed", "cancelled"]

function isValidUrl(value: string | null | undefined) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function when(iso: string | null) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "-"
  return `${formatBookingDate(iso, { month: "short", day: "numeric" })}, ${formatBookingTime(iso)}`
}

// The web Work-Scope Calls page: video consultations between customers and
// staff, with the room link and delete.
export default function AdminMeetingsScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminMeetings({ status: status || undefined, page })
  const del = useDeleteMeeting()
  const meetings = data?.data ?? []

  async function remove(meeting: Meeting) {
    const ok = await confirm({
      title: "Delete work-scope call?",
      message: `This removes the call record for booking #${meeting.booking_id}. The linked booking remains unchanged.`,
      confirmLabel: "Delete call",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(meeting.id, {
      onSuccess: () => toast({ title: "Work-scope call deleted", variant: "success" }),
      onError: (error: unknown) => {
        const d = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
        toast({ title: "Work-scope call not deleted", description: d?.error ?? d?.errors?.join(", ") ?? "Could not delete this work-scope call.", variant: "error" })
      },
    })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Work-Scope Calls" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Video consultations between customers and staff.</p>
      <div className="space-y-3 px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {["", ...STATUSES].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold capitalize",
                status === s ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <p className={`text-sm font-semibold ${mutedClass}`}>{meetings.length} visible calls</p>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading work-scope calls…</p>
        ) : isError ? (
          <p className="text-sm font-semibold text-[#8f3f4b]">Could not load work-scope calls. Try again in a moment.</p>
        ) : meetings.length === 0 ? (
          <div className={`${cardClass} p-5`}>
            <p className="text-base font-bold">No calls found</p>
            <p className={`mt-1 text-sm ${mutedClass}`}>Scheduled consultations will appear here.</p>
          </div>
        ) : (
          meetings.map((m) => (
            <section key={m.id} className={`${cardClass} p-4`}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C96C83]/12 text-[#C96C83]">
                  <Video className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold">Booking #{m.booking_id}</span>
                    <StatusBadgeFor status={m.status} />
                  </div>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    scheduled {when(m.scheduled_at)} · {m.provider}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!isValidUrl(m.url)}
                  onClick={() => void openPaymentUrl(m.url)}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-bold disabled:opacity-40"
                >
                  <Video className="size-4" aria-hidden /> {isValidUrl(m.url) ? "Open room" : "No room"}
                </button>
                <button
                  type="button"
                  disabled={del.isPending}
                  onClick={() => remove(m)}
                  aria-label="Delete work-scope call"
                  className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white disabled:opacity-40"
                >
                  <Trash2 className="size-4 text-[#d4754a]" aria-hidden />
                </button>
              </div>
            </section>
          ))
        )}

        {data?.pagination && data.pagination.total_pages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Prev
            </button>
            <span className={`text-sm ${mutedClass}`}>
              {page} / {data.pagination.total_pages}
            </span>
            <button type="button" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
