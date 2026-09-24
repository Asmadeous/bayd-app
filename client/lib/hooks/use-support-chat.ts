"use client"

import { useCallback, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"

export interface SupportMessage {
  id: number
  body: string
  from_staff: boolean
  sender_name: string | null
  created_at: string
}

export interface SupportThreadView {
  status: "open" | "closed"
  name: string
  unread_count: number
  messages: SupportMessage[]
}

// The visitor's thread token is their only credential for the chat, so it lives
// in this browser only. Storage can be unavailable (private mode), in which case
// the chat still works for the current page view.
const TOKEN_KEY = "bayd-support-thread"

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore: storage blocked
  }
}

export function useSupportChat(open: boolean) {
  const qc = useQueryClient()
  const [storedToken, setToken] = useState<string | null>(() => (typeof window === "undefined" ? null : readToken()))

  const thread = useQuery<SupportThreadView>({
    queryKey: ["support-thread", storedToken, open],
    enabled: !!storedToken,
    // Poll fast while the panel is open, slowly for the unread badge otherwise.
    refetchInterval: open ? 4_000 : 30_000,
    retry: false,
    queryFn: () =>
      api
        .get<SupportThreadView>(`/support/threads/${storedToken}`, { params: open ? { mark_read: true } : undefined })
        .then((r) => r.data),
  })

  // A token the server no longer knows (e.g. deleted thread) starts a fresh chat.
  const lost = (thread.error as { response?: { status?: number } } | null)?.response?.status === 404
  const token = lost ? null : storedToken

  const start = useMutation({
    mutationFn: (input: { name: string; email: string; body: string }) =>
      api
        .post<{ token: string; thread: SupportThreadView }>("/support/threads", {
          thread: { name: input.name, email: input.email },
          body: input.body,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      writeToken(data.token)
      qc.setQueryData(["support-thread", data.token, open], data.thread)
      setToken(data.token)
    },
  })

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post<SupportMessage>(`/support/threads/${token}/messages`, { body }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-thread", token] }),
  })

  const reset = useCallback(() => {
    writeToken(null)
    setToken(null)
  }, [])

  return { token, thread, start, send, reset }
}
