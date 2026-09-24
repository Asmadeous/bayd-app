"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle, Send, X } from "lucide-react"

import { useSupportChat } from "@/lib/hooks/use-support-chat"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"

// Signed-in areas and the native apps have their own messaging, so the bubble
// only shows on the public website.
const HIDDEN_PREFIXES = ["/dashboard", "/app", "/staff"]

const input =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-[#101217] outline-none placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"

// Floating support chat for website visitors. No account needed: a guest gives a
// name and email once, and the conversation continues in this browser. Admins
// answer from the support inbox in the dashboard.
export function SupportChatBubble() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))
  const chat = useSupportChat(open && !hidden)
  const unread = open ? 0 : (chat.thread.data?.unread_count ?? 0)

  if (hidden) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? <ChatPanel chat={chat} onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close support chat" : "Chat with us"}
        aria-expanded={open}
        className="relative flex size-14 items-center justify-center rounded-full bg-[#101217] text-white shadow-xl shadow-black/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c96c83]/40"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        {chat.token && unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[#c96c83] text-[0.65rem] font-bold">
            {unread}
          </span>
        ) : null}
      </button>
    </div>
  )
}

function ChatPanel({ chat, onClose }: { chat: ReturnType<typeof useSupportChat>; onClose: () => void }) {
  const { token, thread, start, send, reset } = chat
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(() => [user?.first_name, user?.last_name].filter(Boolean).join(" "))
  const [email, setEmail] = useState(() => user?.email ?? "")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const messages = thread.data?.messages ?? []

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function errorOf(e: unknown) {
    const d = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
    return d?.error ?? d?.errors?.join(", ") ?? "Couldn't send. Please try again."
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setError(null)
    try {
      if (token) await send.mutateAsync(body)
      else await start.mutateAsync({ name: name.trim(), email: email.trim(), body })
      setDraft("")
    } catch (e) {
      setError(errorOf(e))
    }
  }

  const sending = start.isPending || send.isPending

  return (
    <section
      aria-label="Support chat"
      className="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf7] shadow-2xl shadow-black/20"
    >
      <header className="flex items-start justify-between gap-3 bg-[#101217] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-extrabold">Chat with Beauty @ Your Door</p>
          <p className="text-xs text-white/70">Questions about services, areas, or a booking? Ask us here.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close support chat" className="shrink-0 rounded p-1 hover:bg-white/10">
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {!token ? (
          <p className="rounded-xl bg-white px-3 py-2.5 text-sm text-[#4f535a]">
            Hi! Leave your name and email so we can follow up, then send us your question. No account needed.
          </p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from_staff ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                m.from_staff ? "bg-white text-[#101217]" : "bg-[#c96c83] text-white",
              )}
            >
              {m.from_staff && m.sender_name ? (
                <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#a36f4d]">
                  {m.sender_name}
                </span>
              ) : null}
              {m.body}
            </div>
          </div>
        ))}
        {token && thread.data?.status === "closed" ? (
          <p className="text-center text-xs text-[#8a8d93]">
            This chat was closed. Send a message to reopen it, or{" "}
            <button type="button" onClick={reset} className="font-semibold text-[#c96c83] underline">
              start a new chat
            </button>
            .
          </p>
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-2 border-t border-black/10 bg-white px-3 py-3">
        {!token ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-label="Your name"
              required
              maxLength={80}
            />
            <input
              className={input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-label="Your email"
              required
            />
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            className={cn(input, "max-h-28 min-h-[2.75rem] resize-none")}
            placeholder="Type your message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            rows={1}
            maxLength={2000}
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#c96c83] text-white disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>
        {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
      </form>
    </section>
  )
}
