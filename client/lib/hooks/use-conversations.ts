import { useQuery } from "@tanstack/react-query"

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
