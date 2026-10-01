"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import type { ChatMessage } from "@/lib/cable/chat-types"

export interface ChatReportPerson {
  id: number
  name: string
  email: string | null
  role: string
}

export interface ChatReport {
  id: number
  conversation_id: number
  reason: string
  details: string | null
  status: "open" | "reviewed"
  created_at: string
  reviewed_at: string | null
  reviewed_by: ChatReportPerson | null
  reporter: ChatReportPerson
  reported_user: ChatReportPerson
}

export interface ChatReportDetail extends ChatReport {
  messages: ChatMessage[]
  reports_against_user: number
}

interface ChatReportsResponse {
  data: ChatReport[]
  open_count: number
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export function useChatReports(params: { status?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-chat-reports", params],
    queryFn: () => api.get<ChatReportsResponse>("/admin/chat_reports", { params }).then((r) => r.data),
  })
}

export function useChatReport(id: number | null) {
  return useQuery({
    queryKey: ["admin-chat-reports", "detail", id],
    queryFn: () => api.get<ChatReportDetail>(`/admin/chat_reports/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useSetChatReportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "open" | "reviewed" }) =>
      api.patch<ChatReport>(`/admin/chat_reports/${id}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-chat-reports"] }),
  })
}
