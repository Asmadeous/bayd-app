"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, Send } from "lucide-react"

import api from "@/lib/api"
import { useChat } from "@/lib/cable/use-chat"
import type { Conversation } from "@/lib/cable/chat-types"
import { useAuthStore } from "@/lib/stores/auth-store"
import { formatBookingTime } from "@/lib/booking-time"
import { appScreenClass, mutedClass } from "../../app-theme"

// One live conversation - purpose-built mobile thread on the shared useChat hook
// (history + realtime messages, typing, presence, read receipts). Static-export
// safe: the id comes from ?id=, not a dynamic route segment.
export default function MessageThreadScreen() {
  return (
    <Suspense>
      <MessageThread />
    </Suspense>
  )
}

function MessageThread() {
  const router = useRouter()
  const params = useSearchParams()
  const conversationId = Number(params.get("id")) || 0
  const currentUserId = useAuthStore((s) => s.user?.id ?? 0)

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/conversations").then((r) => r.data),
  })
  const conversation = conversations.find((c) => c.id === conversationId) ?? null
  const name =
    [conversation?.other_participant?.first_name, conversation?.other_participant?.last_name]
      .filter(Boolean)
      .join(" ") || "B.A.Y.D"

  const { messages, otherTyping, otherOnline, send, setTyping } = useChat(conversationId, currentUserId)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as history loads and new ones arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, otherTyping])

  async function onSend() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft("")
    setTyping(false)
    try {
      await send(body)
    } catch {
      setDraft(body) // restore on failure so the customer can retry
    } finally {
      setSending(false)
    }
  }

  const grouped = useMemo(() => messages, [messages])

  if (!conversationId) {
    return (
      <div className={appScreenClass}>
        <ThreadHeader name="Messages" status="" onBack={() => router.push("/app/messages")} />
        <p className={`px-5 text-sm ${mutedClass}`}>Conversation not found.</p>
      </div>
    )
  }

  return (
    // Fixed to the viewport height (h-dvh, NOT min-h) so the message list scrolls
    // internally and the composer stays pinned at the bottom instead of being
    // pushed below the fold as messages fill the column.
    <div className="fixed inset-0 flex flex-col bg-[#F6F1EC] pt-[env(safe-area-inset-top)]">
      <ThreadHeader
        name={name}
        status={otherTyping ? "typing…" : otherOnline ? "online" : ""}
        onBack={() => router.push("/app/messages")}
      />

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {grouped.length === 0 ? (
          <p className={`py-10 text-center text-sm ${mutedClass}`}>
            Say hello - messages you send reach {name}.
          </p>
        ) : (
          grouped.map((m) => {
            const mine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[78%] rounded-2xl rounded-br-md bg-[#c96c83] px-3.5 py-2 text-sm text-white"
                      : "max-w-[78%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#101217] shadow-sm"
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[0.65rem] ${mine ? "text-white/70" : "text-[#101217]/40"}`}>
                    {formatBookingTime(m.created_at)}
                    {mine && m.read_at ? " · Read" : ""}
                  </p>
                </div>
              </div>
            )
          })
        )}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#101217]/50 shadow-sm">
              …
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-black/5 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setTyping(e.target.value.trim().length > 0)
          }}
          onBlur={() => setTyping(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Message…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-black/10 bg-[#F6F1EC] px-4 py-2.5 text-base text-[#101217] outline-none placeholder:text-[#101217]/35 focus:border-[#c96c83]"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#c96c83] text-white transition-opacity disabled:opacity-40"
        >
          <Send className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function ThreadHeader({ name, status, onBack }: { name: string; status: string; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-black/5 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F6F1EC]"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <div className="min-w-0">
        <p className="truncate font-bold text-[#101217]">{name}</p>
        {status && <p className="truncate text-xs font-medium text-[#c96c83]">{status}</p>}
      </div>
    </header>
  )
}
