"use client"

import { useMarkNotificationRead, useNotifications } from "@/lib/hooks/use-notifications"
import { cardClass, mutedClass } from "../app-theme"
import { Bell } from "lucide-react"
import { EmptyState } from "../empty-state"
import { SectionScreen } from "../section-screen"

export default function AppNotificationsScreen() {
  const { data, isLoading } = useNotifications(1)
  const markRead = useMarkNotificationRead()
  const items = data?.data ?? []

  return (
    <SectionScreen title="Notifications">
      {isLoading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" text="Booking updates and reminders will appear here." />
      ) : (
        <ul className="space-y-2 pb-6">
          {items.map((n) => {
            const unread = !n.read_at
            const body = (
              <>
                <div className="flex items-start gap-3">
                  {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#c96c83]" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${unread ? "font-bold" : "font-semibold"}`}>{n.title}</p>
                    {n.body && <p className={`mt-0.5 text-sm ${mutedClass}`}>{n.body}</p>}
                    <p className={`mt-1 text-xs ${mutedClass}`}>
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </>
            )
            return (
              <li key={n.id} className={`p-4 ${cardClass} ${unread ? "" : "opacity-70"}`}>
                {unread ? (
                  <button type="button" onClick={() => markRead.mutate(n.id)} className="w-full text-left">
                    {body}
                  </button>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionScreen>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

