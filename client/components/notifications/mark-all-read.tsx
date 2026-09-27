"use client"

import { Check } from "lucide-react"

import { useMarkAllNotificationsRead, useNotifications } from "@/lib/hooks/use-notifications"

// Sits above the list on both apps' Notifications screens; only shown while
// something is unread.
export function MarkAllReadButton() {
  const { data } = useNotifications(1)
  const markAll = useMarkAllNotificationsRead()
  if (!data?.unread_count) return null

  return (
    <div className="mb-3 flex justify-end">
      <button
        type="button"
        onClick={() => markAll.mutate()}
        disabled={markAll.isPending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-[#14100F] shadow-sm disabled:opacity-50"
      >
        <Check className="size-4 text-[#C96C83]" aria-hidden />
        {markAll.isPending ? "Marking…" : "Mark all as read"}
      </button>
    </div>
  )
}
