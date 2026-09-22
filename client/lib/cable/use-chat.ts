"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Subscription } from "@rails/actioncable"

import api from "@/lib/api"
import { getConsumer } from "@/lib/cable/consumer"
import { isChatMessage, type ChatEvent, type ChatMessage } from "@/lib/cable/chat-types"

interface UseChat {
  messages: ChatMessage[]
  otherTyping: boolean
  otherOnline: boolean
  send: (body: string) => Promise<void>
  setTyping: (typing: boolean) => void
}

// Live chat for one conversation: loads history over REST, then streams new
// messages / typing / presence / read events over ChatChannel (2b-2c). Marks the
// thread read on open. `currentUserId` distinguishes my events from the other's.
export function useChat(conversationId: number, currentUserId: number): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const subRef = useRef<Subscription | null>(null)

  // Load history + mark read.
  useEffect(() => {
    let active = true
    api
      .get<{ data: ChatMessage[] }>(`/conversations/${conversationId}/messages`)
      .then((r) => {
        if (active) setMessages(r.data.data)
      })
      .catch(() => {})
    api.post(`/conversations/${conversationId}/messages/read`).catch(() => {})
    return () => {
      active = false
    }
  }, [conversationId])

  // Subscribe to the live stream.
  useEffect(() => {
    const consumer = getConsumer()
    if (!consumer) return

    const sub = consumer.subscriptions.create(
      { channel: "ChatChannel", conversation_id: conversationId },
      {
        received(event: ChatEvent) {
          if (isChatMessage(event)) {
            setMessages((prev) => (prev.some((m) => m.id === event.id) ? prev : [...prev, event]))
            // A message from the other person, viewed now -> mark read.
            if (event.sender_id !== currentUserId) {
              api.post(`/conversations/${conversationId}/messages/read`).catch(() => {})
            }
            return
          }
          if (event.type === "typing" && event.user_id !== currentUserId) {
            setOtherTyping(event.typing)
          } else if (event.type === "presence" && event.user_id !== currentUserId) {
            setOtherOnline(event.online)
          } else if (event.type === "read" && event.reader_id !== currentUserId) {
            // The OTHER person read the thread -> mark MY messages (the ones they
            // just saw) as read. Don't touch their own messages' read state.
            setMessages((prev) =>
              prev.map((m) => (m.sender_id === currentUserId && !m.read_at ? { ...m, read_at: event.at } : m)),
            )
          }
        },
      }
    )
    subRef.current = sub
    return () => {
      sub.unsubscribe()
      subRef.current = null
    }
  }, [conversationId, currentUserId])

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim()
      if (!trimmed) return
      // Post over REST; the endpoint returns the created message. Append it
      // IMMEDIATELY (optimistic) so the sender sees it without waiting for the
      // cable round-trip - the dedup-by-id in `received` drops the echoed
      // broadcast, so it never appears twice.
      const { data } = await api.post<ChatMessage>(`/conversations/${conversationId}/messages`, { body: trimmed })
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    },
    [conversationId]
  )

  // setTyping(true) signals typing AND schedules an auto-stop after a pause, so
  // the other side never sees "typing…" stuck when the user types then stops
  // without sending. Callers can just fire setTyping(true) on each keystroke -
  // the hook debounces and auto-clears. setTyping(false) stops immediately.
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setTyping = useCallback((typing: boolean) => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
      typingTimer.current = null
    }
    subRef.current?.perform(typing ? "typing" : "stopped_typing", {})
    if (typing) {
      typingTimer.current = setTimeout(() => {
        subRef.current?.perform("stopped_typing", {})
        typingTimer.current = null
      }, 2500)
    }
  }, [])

  // Clear the typing timer if the component unmounts mid-typing.
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [])

  return { messages, otherTyping, otherOnline, send, setTyping }
}
