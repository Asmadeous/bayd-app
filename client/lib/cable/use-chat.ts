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
            setMessages((prev) => prev.map((m) => (m.read_at ? m : { ...m, read_at: event.at })))
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
      // Post over REST (the server broadcasts it back to the stream, incl. to us).
      await api.post(`/conversations/${conversationId}/messages`, { body: trimmed })
    },
    [conversationId]
  )

  const setTyping = useCallback((typing: boolean) => {
    subRef.current?.perform(typing ? "typing" : "stopped_typing", {})
  }, [])

  return { messages, otherTyping, otherOnline, send, setTyping }
}
