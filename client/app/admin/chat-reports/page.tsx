"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { formatBookingDateTime } from "@/lib/booking-time"
import { useChatReports } from "@/lib/hooks/use-chat-reports"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"
import { Person } from "./person"

const FILTERS = ["open", "reviewed", "all"] as const

export default function AdminChatReportsScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <ChatReports />
    </Suspense>
  )
}

// The web Chat reports page. The Terms promise a review within 24 hours, so
// open reports lead. `?id=<id>` (the admin alert's link) opens that report.
function ChatReports() {
  const router = useRouter()
  const linked = Number(useSearchParams().get("id"))
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useChatReports({ status: filter === "all" ? undefined : filter, page })
  const reports = data?.data ?? []

  useEffect(() => {
    if (linked > 0) router.replace(`/admin/chat-reports/view?id=${linked}`)
  }, [linked, router])

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Chat reports" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        {data?.open_count
          ? `${data.open_count} waiting for review. Reports should be reviewed within 24 hours.`
          : "No reports waiting. Reports from the apps' chat appear here."}
      </p>
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={(f) => {
            setFilter(f)
            setPage(1)
          }}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading reports…</p>
        ) : reports.length === 0 ? (
          <EmptyCard title="No reports" body="Reports matching this filter will appear here." />
        ) : (
          reports.map((r) => (
            <Link key={r.id} href={`/admin/chat-reports/view?id=${r.id}`} className={`${cardClass} block p-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold">{r.reason}</span>
                <StatusBadge tone={r.status === "open" ? "gold" : "green"}>{r.status === "open" ? "Open" : "Reviewed"}</StatusBadge>
              </div>
              <p className={`mt-1 text-xs ${mutedClass}`}>{formatBookingDateTime(r.created_at)}</p>
              <p className="mt-2 text-sm">
                <Person person={r.reporter} /> reported <Person person={r.reported_user} />
              </p>
              {r.details ? <p className="mt-2 line-clamp-2 text-sm">&ldquo;{r.details}&rdquo;</p> : null}
            </Link>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
