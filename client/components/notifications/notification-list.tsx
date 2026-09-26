"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { LoadMore } from "@/components/load-more"
import { useMarkNotificationRead, useNotificationsList } from "@/lib/hooks/use-notifications"
import { notificationPath } from "@/lib/notification-path"

// The notifications list both apps share. Tapping one marks it read and opens
// the page it's about (the booking, the loyalty screen, ...).
export function NotificationList({
  app,
  cardClassName,
  empty,
}: {
  app: "customer" | "staff"
  cardClassName: string
  empty: React.ReactNode
}) {
  const router = useRouter()
  const { items, isLoading, hasMore, loadingMore, loadMore } = useNotificationsList()
  const markRead = useMarkNotificationRead()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-black/[0.04]" />
        ))}
      </div>
    )
  }
  if (items.length === 0) return <>{empty}</>

  return (
    <>
      <ul className="space-y-2 pb-6">
        {items.map((n) => {
          const unread = !n.read_at
          const path = notificationPath(n, app)
          const body = (
            <div className="flex items-start gap-3">
              {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#c96c83]" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${unread ? "font-bold" : "font-semibold"}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-[#14100F]/55">{n.body}</p>}
                <p className="mt-1 text-xs text-[#14100F]/55">
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              {path && <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#14100F]/35" aria-hidden />}
            </div>
          )
          return (
            <li key={n.id} className={`${cardClassName} ${unread ? "" : "opacity-70"}`}>
              {unread || path ? (
                <button
                  type="button"
                  onClick={() => {
                    if (unread) markRead.mutate(n.id)
                    if (path) router.push(path)
                  }}
                  className="w-full p-4 text-left"
                >
                  {body}
                </button>
              ) : (
                <div className="p-4">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
      <LoadMore className="mb-6" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
    </>
  )
}
