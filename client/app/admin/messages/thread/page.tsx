"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { ChatPhoto } from "@/components/chat/chat-photos"
import { LoadEarlier } from "@/components/load-earlier"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingTime } from "@/lib/booking-time"
import { useChat } from "@/lib/cable/use-chat"
import { useConversation } from "@/lib/hooks/use-conversations"
import { useAuthStore } from "@/lib/stores/auth-store"
import { mutedClass } from "../../admin-theme"
import { apiError } from "../../ui"
import { ReplyBar, ThreadHeader, threadScreenClass } from "../../thread-screen"

export default function AdminMessageThreadScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <MessageThread />
    </Suspense>
  )
}

// One live conversation (history, realtime messages, typing, read receipts).
// Like the web, admins don't get Report/Block here; they moderate from Chat
// reports.
function MessageThread() {
  const conversationId = Number(useSearchParams().get("id")) || 0
  const currentUserId = useAuthStore((s) => s.user?.id ?? 0)
  const { toast } = useToast()
  const { data: conversation = null } = useConversation(conversationId)
  const name = [conversation?.other_participant?.first_name, conversation?.other_participant?.last_name].filter(Boolean).join(" ") || "B.A.Y.D"
  const { messages, hasEarlier, loadingEarlier, loadEarlier, otherTyping, otherOnline, send, setTyping } = useChat(conversationId, currentUserId)
  const newestId = messages[messages.length - 1]?.id
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Follow the newest message (not older history loaded above it).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [newestId, otherTyping])

  async function onSend() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft("")
    setTyping(false)
    try {
      await send(body, null)
    } catch (e) {
      setDraft(body)
      toast({ title: "Message not sent", description: apiError(e, "Please try again."), variant: "error" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={threadScreenClass}>
      <ThreadHeader
        name={conversationId ? name : "Messages"}
        avatarUrl={conversation?.other_participant?.avatar_url}
        status={otherTyping ? "typing…" : otherOnline ? "online" : ""}
      />
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <LoadEarlier hasEarlier={hasEarlier} loading={loadingEarlier} loadEarlier={loadEarlier} scrollRef={scrollRef} />
        {!conversationId ? (
          <p className={`py-10 text-center text-sm ${mutedClass}`}>Conversation not found.</p>
        ) : messages.length === 0 ? (
          <p className={`py-10 text-center text-sm ${mutedClass}`}>Say hello - messages you send reach {name}.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[78%] rounded-2xl rounded-br-md bg-[#C96C83] px-3.5 py-2 text-sm text-white"
                      : "max-w-[78%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#14100F] shadow-sm"
                  }
                >
                  {m.image_url ? <ChatPhoto url={m.image_url} /> : null}
                  {m.body ? <p className={`whitespace-pre-wrap break-words ${m.image_url ? "mt-1.5" : ""}`}>{m.body}</p> : null}
                  <p className={`mt-0.5 text-[0.8125rem] ${mine ? "text-white/70" : "text-[#14100F]/40"}`}>
                    {formatBookingTime(m.created_at)}
                    {mine && m.read_at ? " · Read" : ""}
                  </p>
                </div>
              </div>
            )
          })
        )}
        {otherTyping ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#14100F]/50 shadow-sm">…</div>
          </div>
        ) : null}
      </div>
      {conversationId ? (
        <ReplyBar
          value={draft}
          onChange={(v) => {
            setDraft(v)
            setTyping(v.trim().length > 0)
          }}
          onBlur={() => setTyping(false)}
          onSend={onSend}
          disabled={!draft.trim() || sending}
        />
      ) : null}
    </div>
  )
}
