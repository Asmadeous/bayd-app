"use client"

import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import type { Conversation } from "@/lib/cable/chat-types"
import { useNotifications } from "@/lib/hooks/use-notifications"

export type NavBadge = "notifications" | "messages" | "chatReports"

const POLL_MS = 60_000

// Counts shown next to sidebar links. Messages sum the unread counts on the
// newest page of conversations, which is where anything unread will be.
export function useNavBadges(isAdmin: boolean): Record<NavBadge, number> {
  const { data: notifications } = useNotifications(1)

  const { data: messages = 0 } = useQuery({
    queryKey: ["conversations", "unread-total"],
    queryFn: () =>
      api
        .get<{ data: Conversation[] }>("/conversations", { params: { page: 1 } })
        .then((r) => r.data.data.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)),
    refetchInterval: POLL_MS,
  })

  const { data: chatReports = 0 } = useQuery({
    queryKey: ["admin-chat-reports", "open-count"],
    queryFn: () =>
      api
        .get<{ open_count: number }>("/admin/chat_reports", { params: { status: "open", per_page: 1 } })
        .then((r) => r.data.open_count),
    enabled: isAdmin,
    refetchInterval: POLL_MS,
  })

  return { notifications: notifications?.unread_count ?? 0, messages, chatReports }
}
