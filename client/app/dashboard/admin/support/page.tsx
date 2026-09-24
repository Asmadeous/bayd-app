"use client"

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { MessageCircle, Send } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { SupportMessage } from "@/lib/hooks/use-support-chat"
import { cn } from "@/lib/utils"

interface SupportThreadRow {
  id: number
  name: string
  email: string
  status: "open" | "closed"
  user_id: number | null
  last_message_at: string | null
  created_at: string
  unread_count: number
  last_message: string | null
}

interface SupportThreadDetail extends SupportThreadRow {
  messages: SupportMessage[]
}

type StatusFilter = "open" | "closed"

function formatWhen(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

// Website support chat inbox. Visitors (guests or customers) write from the
// site's chat bubble; admins reply here. Polls so new messages show up live.
export default function AdminSupportPage() {
  return (
    <Suspense>
      <SupportInbox />
    </Suspense>
  )
}

function SupportInbox() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<StatusFilter>("open")
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(searchParams.get("thread")) || null)

  const threads = useQuery<{ data: SupportThreadRow[] }>({
    queryKey: ["admin-support-threads", status],
    refetchInterval: 10_000,
    queryFn: () => api.get("/admin/support_threads", { params: { status } }).then((r) => r.data),
  })
  const rows = threads.data?.data ?? []

  return (
    <DashboardPage>
      <DashboardHeader title="Support Chat" subtitle="Questions from website visitors, with or without an account." />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {(["open", "closed"] as const).map((s) => (
              <SegmentButton key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === "open" ? "Open" : "Closed"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <DashboardPanel className="p-0">
          {threads.isLoading ? (
            <p className="p-5 text-sm text-[#5f6268]">Loading chats...</p>
          ) : rows.length === 0 ? (
            <EmptyState
              className="border-0 py-10"
              icon={MessageCircle}
              title={status === "open" ? "No open chats" : "No closed chats"}
              description="New messages from the website chat bubble show up here."
            />
          ) : (
            <ul className="divide-y divide-black/8">
              {rows.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "block w-full px-4 py-3 text-left transition-colors hover:bg-black/[0.03]",
                      selectedId === t.id && "bg-[#c96c83]/8",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold text-[#101217]">{t.name}</p>
                      {t.unread_count > 0 ? (
                        <span className="rounded-full bg-[#c96c83] px-2 py-0.5 text-[0.65rem] font-bold text-white">
                          {t.unread_count}
                        </span>
                      ) : (
                        <span className="text-xs text-[#8a8d93]">{formatWhen(t.last_message_at)}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#5f6268]">{t.email}{t.user_id ? " · customer" : " · guest"}</p>
                    {t.last_message ? <p className="mt-1 line-clamp-2 text-sm text-[#4f535a]">{t.last_message}</p> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        {selectedId ? (
          <ThreadView key={selectedId} id={selectedId} />
        ) : (
          <DashboardPanel>
            <EmptyState
              className="border-0 py-16"
              icon={MessageCircle}
              title="Pick a chat"
              description="Select a conversation to read and reply."
            />
          </DashboardPanel>
        )}
      </div>
    </DashboardPage>
  )
}

function ThreadView({ id }: { id: number }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [draft, setDraft] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const thread = useQuery<SupportThreadDetail>({
    queryKey: ["admin-support-thread", id],
    refetchInterval: 5_000,
    queryFn: () => api.get(`/admin/support_threads/${id}`).then((r) => r.data),
  })
  const messages = thread.data?.messages ?? []

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-support-thread", id] })
    qc.invalidateQueries({ queryKey: ["admin-support-threads"] })
  }

  const reply = useMutation({
    mutationFn: (body: string) => api.post(`/admin/support_threads/${id}/reply`, { body }).then((r) => r.data),
    onSuccess: () => {
      setDraft("")
      refresh()
    },
    onError: () => toast({ title: "Reply not sent", description: "Please try again.", variant: "error" }),
  })

  const setStatus = useMutation({
    mutationFn: (status: "open" | "closed") => api.patch(`/admin/support_threads/${id}`, { status }).then((r) => r.data),
    onSuccess: (_data, status) => {
      refresh()
      toast({ title: status === "closed" ? "Chat closed" : "Chat reopened", variant: "success" })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (body) reply.mutate(body)
  }

  if (thread.isLoading) {
    return (
      <DashboardPanel>
        <p className="text-sm text-[#5f6268]">Loading chat...</p>
      </DashboardPanel>
    )
  }
  if (!thread.data) {
    return (
      <DashboardPanel>
        <p className="text-sm text-[#5f6268]">This chat could not be loaded.</p>
      </DashboardPanel>
    )
  }

  const t = thread.data
  return (
    <DashboardPanel className="flex min-h-[32rem] flex-col p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-5 py-4">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-[#101217]">{t.name}</p>
          <a href={`mailto:${t.email}`} className="text-sm text-[#c96c83] hover:underline">
            {t.email}
          </a>
          <span className="text-sm text-[#5f6268]">{t.user_id ? " · has an account" : " · guest"}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate(t.status === "open" ? "closed" : "open")}
        >
          {t.status === "open" ? "Close chat" : "Reopen chat"}
        </Button>
      </div>

      <div ref={listRef} className="max-h-[28rem] flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from_staff ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                m.from_staff ? "bg-[#101217] text-white" : "bg-[#f4f1eb] text-[#101217]",
              )}
            >
              {m.body}
              <span className={cn("mt-1 block text-[0.65rem]", m.from_staff ? "text-white/60" : "text-[#8a8d93]")}>
                {m.from_staff && m.sender_name ? `${m.sender_name} · ` : ""}
                {formatWhen(m.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-black/8 px-5 py-4">
        <textarea
          className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
          placeholder={`Reply to ${t.name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          rows={2}
          maxLength={2000}
          aria-label="Reply"
        />
        <Button type="submit" disabled={reply.isPending || !draft.trim()}>
          <Send className="size-4" aria-hidden /> Send
        </Button>
      </form>
    </DashboardPanel>
  )
}
