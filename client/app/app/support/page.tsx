"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Send } from "lucide-react"

import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useSupportChat } from "@/lib/hooks/use-support-chat"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"
import { mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

// Support chat with the Beauty @ Your Door team, in the app. Same threads as the
// website bubble: the signed-in customer's name and email come from their
// account, admins answer from the dashboard inbox, and replies arrive by push.
export default function SupportScreen() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const { token, thread, start, send, reset } = useSupportChat(true)
  const [draft, setDraft] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const messages = thread.data?.messages ?? []
  const sending = start.isPending || send.isPending

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

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
    <SectionScreen title="Support">
      <div className="flex h-[calc(100dvh-13rem)] flex-col">
        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pb-3" aria-live="polite">
          <p className={`rounded-2xl bg-white px-4 py-3 text-sm ${mutedClass}`}>
            Questions about a service, your area, or a booking? Send us a message and the team will reply here.
          </p>
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.from_staff ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm",
                  m.from_staff ? "bg-white text-[#101217]" : "bg-[#c96c83] text-white",
                )}
              >
                {m.from_staff ? (
                  <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#a36f4d]">B.A.Y.D team</span>
                ) : null}
                {m.body}
              </div>
            </div>
          ))}
          {token && thread.data?.status === "closed" ? (
            <p className={`text-center text-xs ${mutedClass}`}>
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
    </SectionScreen>
  )
}
