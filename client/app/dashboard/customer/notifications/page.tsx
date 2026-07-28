"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/lib/hooks/use-notifications"

export default function CustomerNotificationsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useNotifications(page)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const unread = data?.unread_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        actions={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              Mark all read
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center">
          <Bell className="mx-auto size-8 text-[#c8b9aa] mb-3" />
          <p className="text-sm text-[#5f6268]">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={() => markRead.mutate(n.id)} />
          ))}
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

function NotificationRow({ notification: n, onRead }: { notification: AppNotification; onRead: () => void }) {
  const isUnread = !n.read_at
  const cta = (n.metadata?.cta as string) || "View"

  return (
    <div
      className="rounded-xl border bg-white px-5 py-4 flex items-start gap-3"
      style={{ borderColor: isUnread ? "#c96c8344" : "rgba(0,0,0,0.08)" }}
    >
      <span
        className="mt-1.5 size-2 rounded-full shrink-0"
        style={{ background: isUnread ? "#c96c83" : "transparent" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-[#101217]">{n.title}</p>
          <span className="text-xs text-[#5f6268] shrink-0">
            {new Date(n.created_at).toLocaleDateString("en-CA")}
          </span>
        </div>
        {n.body && <p className="text-sm text-[#5f6268] mt-1">{n.body}</p>}
        <div className="flex items-center gap-3 mt-2">
          {n.action_url && (
            <Link
              href={n.action_url.replace(/^https?:\/\/[^/]+/, "")}
              onClick={onRead}
              className="text-xs font-semibold text-[#c96c83] hover:underline"
            >
              {cta} →
            </Link>
          )}
          {isUnread && (
            <button onClick={onRead} className="inline-flex items-center gap-1 text-xs text-[#5f6268] hover:text-[#101217]">
              <Check className="size-3.5" /> Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
