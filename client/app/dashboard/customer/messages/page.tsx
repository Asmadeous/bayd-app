"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Send } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useChat } from "@/lib/cable/use-chat"
import { useToast } from "@/components/bayd-toast-provider"
import type { Conversation } from "@/lib/cable/chat-types"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function CustomerMessagesPage() {
  const currentUserId = useAuthStore((s) => s.user?.id ?? 0)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [active, setActive] = useState<Conversation | null>(null)

  useEffect(() => {
    api.get<Conversation[]>("/conversations").then((r) => setConversations(r.data)).catch(() => {})
  }, [])

  return (
    <DashboardPage>
      <DashboardHeader title="Messages" subtitle="Chat with your technician and the B.A.Y.D team." />
      <DashboardPanel>
        {active ? (
          <ChatThread
            conversation={active}
            currentUserId={currentUserId}
            onBack={() => setActive(null)}
          />
        ) : conversations.length === 0 ? (
          <EmptyState title="No conversations yet" description="Your chats will appear here." />
        ) : (
          <ul className="divide-y divide-black/10">
            {conversations.map((c) => {
              const name = [c.other_participant?.first_name, c.other_participant?.last_name]
                .filter(Boolean)
                .join(" ") || "B.A.Y.D"
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c)}
                    className="flex w-full items-center justify-between px-1 py-3 text-left"
                  >
                    <span className="font-bold text-[#101217]">{name}</span>
                    {c.unread_count > 0 && (
                      <span className="ml-2 rounded-full bg-[#c96c83] px-2 py-0.5 text-xs font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </DashboardPanel>
    </DashboardPage>
  )
}

function ChatThread({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation
  currentUserId: number
  onBack: () => void
}) {
  const { messages, otherTyping, otherOnline, send, setTyping } = useChat(conversation.id, currentUserId)
  const [draft, setDraft] = useState("")
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, otherTyping])

  const { toast } = useToast()
  const name = [conversation.other_participant?.first_name, conversation.other_participant?.last_name]
    .filter(Boolean)
    .join(" ") || "B.A.Y.D"

  async function submit() {
    const body = draft
    setDraft("")
    setTyping(false)
    try {
      await send(body)
    } catch (e) {
      setDraft(body)
      toast({ title: "Message not sent", description: sendError(e), variant: "error" })
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="mb-2 flex items-center gap-2 border-b border-black/10 pb-2">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1">
          <ArrowLeft className="size-5" />
        </button>
        <span className="font-bold text-[#101217]">{name}</span>
        <span className={`ml-auto text-xs ${otherOnline ? "text-green-600" : "text-[#8a8d93]"}`}>
          {otherOnline ? "online" : "offline"}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-2">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-[#c96c83] text-white" : "bg-black/5 text-[#101217]"
                }`}
              >
                {m.body}
                {mine && m.read_at && <span className="ml-2 text-[10px] opacity-80">Read</span>}
              </div>
            </div>
          )
        })}
        {otherTyping && <p className="text-xs italic text-[#8a8d93]">typing…</p>}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-black/10 pt-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setTyping(e.target.value.length > 0)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-black/15 px-4 py-2 text-sm outline-none focus:border-[#c96c83]"
        />
        <Button type="button" onClick={submit} disabled={!draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// The API explains why a send was refused (e.g. customer-technician messaging
// only opens 30 minutes before the appointment); show that instead of failing silently.
function sendError(e: unknown) {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Message not sent. Please try again."
}
