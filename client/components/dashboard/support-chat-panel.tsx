"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Send } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { LoadEarlier } from "@/components/load-earlier"
import { useSupportChat } from "@/lib/hooks/use-support-chat"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"

// The customer app's Support chat, for the web dashboard: the same thread as the
// app and the website bubble (the customer's name and email come from their
// account), answered by the team from the admin Support Chat inbox.
export function SupportChatPanel() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const { token, thread, messages, hasEarlier, loadingEarlier, loadEarlier, start, send, reset } = useSupportChat(true)
  const [draft, setDraft] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const newestId = messages[messages.length - 1]?.id
  const sending = start.isPending || send.isPending

  // Follow the newest message (not older history loaded above it).
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [newestId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    try {
      if (token) {
        await send.mutateAsync(body)
      } else {
        const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Customer"
        await start.mutateAsync({ name, email: user?.email ?? "", body })
      }
      setDraft("")
    } catch (e) {
      const d = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
      toast({ title: "Message not sent", description: d?.error ?? d?.errors?.join(", ") ?? "Please try again.", variant: "error" })
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pb-3" aria-live="polite">
        <LoadEarlier hasEarlier={hasEarlier} loading={loadingEarlier} loadEarlier={loadEarlier} scrollRef={listRef} />
        <p className="rounded-2xl bg-[#fbfaf7] px-4 py-3 text-sm text-[#5f6268]">
          Questions about a service, your area, or a booking? Send us a message and the team will reply here.
        </p>
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from_staff ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm",
                m.from_staff ? "bg-black/5 text-[#101217]" : "bg-[#c96c83] text-white",
              )}
            >
              {m.from_staff ? (
                <span className="mb-0.5 block text-[0.75rem] font-bold uppercase tracking-[0.08em] text-[#a36f4d]">B.A.Y.D team</span>
              ) : null}
              {m.body}
            </div>
          </div>
        ))}
        {token && thread.data?.status === "closed" ? (
          <p className="text-center text-sm text-[#5f6268]">
            This chat was closed. Send a message to reopen it, or{" "}
            <button type="button" onClick={reset} className="font-semibold text-[#c96c83] underline">
              start a new chat
            </button>
            .
          </p>
        ) : null}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-black/10 pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="Type your message"
          rows={1}
          maxLength={2000}
          aria-label="Message"
          className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c96c83]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#c96c83] text-white disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  )
}
