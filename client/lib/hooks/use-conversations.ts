import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import type { Conversation } from "@/lib/cable/chat-types"
import { usePagedList } from "@/lib/hooks/use-paged-list"

// My conversations, most recent first, a page at a time for "Load more".
export function useConversationsList() {
  return usePagedList<Conversation>(["conversations", "list"], (page) =>
    api
      .get<{ data: Conversation[]; pagination: { next_page: number | null } }>("/conversations", { params: { page } })
      .then((r) => r.data),
  )
}

// One of my conversations (the thread screen's header).
export function useConversation(id: number) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

// Block or unblock the other person in a conversation. The server returns the
// updated conversation, which replaces the cached one so the thread updates.
export function useSetBlocked(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (blocked: boolean) =>
      (blocked ? api.post<Conversation>(`/conversations/${id}/block`) : api.delete<Conversation>(`/conversations/${id}/block`))
        .then((r) => r.data),
    onSuccess: (convo) => {
      qc.setQueryData(["conversations", id], convo)
      qc.invalidateQueries({ queryKey: ["conversations", "list"] })
    },
  })
}

// Report the other person; admins are alerted.
export function useReportConversation(id: number) {
  return useMutation({
    mutationFn: (data: { reason: string; details?: string }) =>
      api.post(`/conversations/${id}/report`, data).then((r) => r.data),
  })
}
