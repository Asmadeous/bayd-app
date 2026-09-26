"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { usePagedList } from "@/lib/hooks/use-paged-list"

export interface AppNotification {
  id: number
  kind: string
  title: string
  body: string | null
  action_url: string | null
  booking_id: number | null
  read_at: string | null
  created_at: string
  metadata: Record<string, unknown>
}

interface NotificationsResponse {
  data: AppNotification[]
  unread_count: number
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ["notifications", page],
    queryFn: () =>
      api.get<NotificationsResponse>("/notifications", { params: { page } }).then((r) => r.data),
    refetchInterval: 60_000,
  })
}

// Notifications, newest first, a page at a time for "Load more".
export function useNotificationsList() {
  return usePagedList<AppNotification>(["notifications", "list"], (page) =>
    api.get<NotificationsResponse>("/notifications", { params: { page } }).then((r) => r.data),
  )
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/notifications/read_all`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}
