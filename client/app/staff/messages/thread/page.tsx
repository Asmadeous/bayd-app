"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Send } from "lucide-react"

import { ChatAvatar } from "@/components/chat/chat-avatar"
import { ChatPhoto, ChatPhotoButton, ChatPhotoPreview } from "@/components/chat/chat-photos"
import { ChatBlockedNotice, ChatSafetyMenu } from "@/components/chat/chat-safety"
import { LoadEarlier } from "@/components/load-earlier"
import { useChat } from "@/lib/cable/use-chat"
import { useConversation } from "@/lib/hooks/use-conversations"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useAuthStore } from "@/lib/stores/auth-store"
import { formatBookingTime } from "@/lib/booking-time"
import { staffScreenClass, mutedClass } from "../../staff-theme"

// One live conversation for a technician - purpose-built mobile thread on the
// shared useChat hook (history + realtime messages, typing, presence, read
// receipts). Static-export safe: the id comes from ?id=, not a route segment.
export default function StaffMessageThreadScreen() {
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

  const { data: conversation = null } = useConversation(conversationId)
  const name =
    [conversation?.other_participant?.first_name, conversation?.other_participant?.last_name]
      .filter(Boolean)
      .join(" ") || "B.A.Y.D"
  const blocked = !!(conversation?.blocked_by_me || conversation?.blocked_me)

  const { messages, hasEarlier, loadingEarlier, loadEarlier, otherTyping, otherOnline, send, setTyping } = useChat(
    conversationId,
    currentUserId,
  )
  const newestId = messages[messages.length - 1]?.id

  const [draft, setDraft] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Follow the newest message (not older history loaded above it).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [newestId, otherTyping])

  const { toast } = useToast()

  async function onSend() {
    const body = draft.trim()
    const image = photo
    if ((!body && !image) || sending) return
    setSending(true)
    setDraft("")
    setPhoto(null)
    setTyping(false)
    try {
      await send(body, image)
    } catch (e) {
      // Restore on failure so the tech can retry.
      setDraft(body)
      setPhoto(image)
      toast({ title: "Message not sent", description: sendError(e), variant: "error" })
    } finally {
      setSending(false)
    }
  }

  const grouped = useMemo(() => messages, [messages])

  if (!conversationId) {
    return (
      <div className={staffScreenClass}>
        <ThreadHeader name="Messages" avatarUrl={null} status="" onBack={() => router.push("/staff/messages")} />
        <p className={`px-5 text-sm ${mutedClass}`}>Conversation not found.</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F4F2EF] pt-[var(--top-inset)]">
      <ThreadHeader
        name={name}
        avatarUrl={conversation?.other_participant?.avatar_url}
        status={otherTyping ? "typing…" : otherOnline ? "online" : ""}
        onBack={() => router.push("/staff/messages")}
        action={
          conversation ? (
            <ChatSafetyMenu conversationId={conversationId} name={name} blockedByMe={!!conversation.blocked_by_me} />
          ) : null
        }
      />

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <LoadEarlier hasEarlier={hasEarlier} loading={loadingEarlier} loadEarlier={loadEarlier} scrollRef={scrollRef} />
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
                      ? "max-w-[78%] rounded-2xl rounded-br-md bg-[#C96C83] px-3.5 py-2 text-sm text-white"
                      : "max-w-[78%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#14100F] shadow-sm"
                  }
                >
                  {m.image_url && <ChatPhoto url={m.image_url} />}
                  {m.body && <p className={`whitespace-pre-wrap break-words ${m.image_url ? "mt-1.5" : ""}`}>{m.body}</p>}
                  <p className={`mt-0.5 text-[0.8125rem] ${mine ? "text-white/70" : "text-[#14100F]/40"}`}>
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
            <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-[#14100F]/50 shadow-sm">
              …
            </div>
          </div>
        )}
      </div>

      {blocked ? (
        <ChatBlockedNotice name={name} blockedByMe={!!conversation?.blocked_by_me} />
      ) : (
        <div className="border-t border-black/5 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {photo && <ChatPhotoPreview file={photo} onRemove={() => setPhoto(null)} />}
          <div className="flex items-end gap-2">
            <ChatPhotoButton onPick={setPhoto} className="text-[#14100F]/60" />
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
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-black/10 bg-[#F4F2EF] px-4 py-2.5 text-base text-[#14100F] outline-none placeholder:text-[#14100F]/35 focus:border-[#C96C83]"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={(!draft.trim() && !photo) || sending}
              aria-label="Send"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[#C96C83] text-white transition-opacity disabled:opacity-40"
            >
              <Send className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ThreadHeader({
  name,
  avatarUrl,
  status,
  onBack,
  action,
}: {
  name: string
  avatarUrl: string | null | undefined
  status: string
  onBack: () => void
  action?: React.ReactNode
}) {
  return (
    <header className="flex items-center gap-3 border-b border-black/5 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F4F2EF]"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <ChatAvatar name={name} url={avatarUrl} className="size-10" />
      <div className="min-w-0">
        <p className="truncate font-bold text-[#14100F]">{name}</p>
        {status && <p className="truncate text-sm font-medium text-[#C96C83]">{status}</p>}
      </div>
      {action}
    </header>
  )
}

// The API explains why a send was refused (e.g. the other person is blocked);
// show that instead of failing silently.
function sendError(e: unknown) {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Message not sent. Please try again."
}
