"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDateTime } from "@/lib/booking-time"
import { mutedClass } from "../../admin-theme"
import { ReplyBar, ThreadHeader, threadScreenClass } from "../../thread-screen"
import type { SupportThreadDetail } from "../types"

export default function AdminSupportThreadScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <SupportThread />
    </Suspense>
  )
}

// One website support chat: read, reply, close or reopen. Polls like the web.
function SupportThread() {
  const id = Number(useSearchParams().get("id")) || 0
  const qc = useQueryClient()
  const { toast } = useToast()
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const thread = useQuery<SupportThreadDetail>({
    queryKey: ["admin-support-thread", id],
    refetchInterval: 5_000,
    queryFn: () => api.get(`/admin/support_threads/${id}`).then((r) => r.data),
    enabled: id > 0,
  })
  const t = thread.data
  const messages = t?.messages ?? []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
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
    onError: () => toast({ title: "Chat not updated", description: "Please try again.", variant: "error" }),
  })

  return (
    <div className={threadScreenClass}>
      <ThreadHeader
        name={t?.name ?? "Support chat"}
        status={t ? (t.user_id ? "has an account" : "guest") : ""}
        action={
          t ? (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate(t.status === "open" ? "closed" : "open")}
              className="h-9 shrink-0 rounded-full border border-black/10 px-3 text-sm font-bold disabled:opacity-40"
            >
              {t.status === "open" ? "Close" : "Reopen"}
            </button>
          ) : null
        }
      />
      {t ? (
        <a href={`mailto:${t.email}`} className="block truncate border-b border-black/5 bg-white px-4 pb-2 text-sm font-semibold text-[#C96C83]">
          {t.email}
        </a>
      ) : null}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {thread.isLoading ? (
          <p className={`py-10 text-center text-sm ${mutedClass}`}>Loading chat…</p>
        ) : !t ? (
          <p className={`py-10 text-center text-sm ${mutedClass}`}>This chat could not be loaded.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.from_staff ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.from_staff
                    ? "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#14100F] px-3.5 py-2 text-sm text-white"
                    : "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm shadow-sm"
                }
              >
                {m.body}
                <span className={`mt-0.5 block text-[0.8125rem] ${m.from_staff ? "text-white/60" : "text-[#14100F]/40"}`}>
                  {m.from_staff && m.sender_name ? `${m.sender_name} · ` : ""}
                  {formatBookingDateTime(m.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      {t ? (
        <ReplyBar
          value={draft}
          onChange={setDraft}
          onSend={() => {
            const body = draft.trim()
            if (body && !reply.isPending) reply.mutate(body)
          }}
          disabled={!draft.trim() || reply.isPending}
          placeholder={`Reply to ${t.name}`}
        />
      ) : null}
    </div>
  )
}
