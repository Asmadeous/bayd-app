"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"

import api from "@/lib/api"
import { formatBookingDateTime } from "@/lib/booking-time"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips } from "../ui"
import type { SupportThreadRow } from "./types"

const STATUSES = ["open", "closed"] as const

export default function AdminSupportScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <SupportInbox />
    </Suspense>
  )
}

// The web Support Chat page: questions from the website's chat bubble, open or
// closed. `?thread=<id>` (the admin alert's link) opens that chat.
function SupportInbox() {
  const router = useRouter()
  const linked = Number(useSearchParams().get("thread"))
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("open")
  const threads = useQuery<{ data: SupportThreadRow[] }>({
    queryKey: ["admin-support-threads", status],
    refetchInterval: 10_000,
    queryFn: () => api.get("/admin/support_threads", { params: { status } }).then((r) => r.data),
  })
  const rows = threads.data?.data ?? []

  useEffect(() => {
    if (linked > 0) router.replace(`/admin/support/thread?id=${linked}`)
  }, [linked, router])

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Support chat" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Questions from website visitors, with or without an account.</p>
      <div className="space-y-3 px-5">
        <FilterChips options={STATUSES} value={status} onChange={setStatus} />
        {threads.isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading chats…</p>
        ) : rows.length === 0 ? (
          <EmptyCard title={status === "open" ? "No open chats" : "No closed chats"} body="New messages from the website chat bubble show up here." />
        ) : (
          rows.map((t) => (
            <Link key={t.id} href={`/admin/support/thread?id=${t.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-bold">{t.name}</p>
                  {t.unread_count > 0 ? (
                    <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#C96C83] px-1.5 text-sm font-bold text-white">{t.unread_count}</span>
                  ) : t.last_message_at ? (
                    <span className={`shrink-0 text-xs ${mutedClass}`}>{formatBookingDateTime(t.last_message_at)}</span>
                  ) : null}
                </div>
                <p className={`truncate text-sm ${mutedClass}`}>
                  {t.email}
                  {t.user_id ? " · customer" : " · guest"}
                </p>
                {t.last_message ? <p className="mt-1 line-clamp-2 text-sm">{t.last_message}</p> : null}
              </div>
              <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
