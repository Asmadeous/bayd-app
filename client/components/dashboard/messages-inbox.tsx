"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Ban, Flag, Send } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { ChatPhoto } from "@/components/chat/chat-photos"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadEarlier } from "@/components/load-earlier"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { Conversation } from "@/lib/cable/chat-types"
import { useChat } from "@/lib/cable/use-chat"
import {
  useConversation,
  useConversationsList,
  useReportConversation,
  useSetBlocked,
} from "@/lib/hooks/use-conversations"
import { useAuthStore } from "@/lib/stores/auth-store"

// Must match ChatReport::REASONS on the server.
const REPORT_REASONS = ["Harassment or abuse", "Inappropriate or sexual content", "Spam or scam", "Something else"]

const ROLE_LABEL: Record<string, string> = {
  customer: "Client",
  employee: "Technician",
  partner: "Partner",
  admin: "B.A.Y.D team",
}

function participantName(c: Pick<Conversation, "other_participant">) {
  return [c.other_participant?.first_name, c.other_participant?.last_name].filter(Boolean).join(" ") || "B.A.Y.D"
}

function apiError(e: unknown, fallback = "Please try again.") {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}

// The dashboard Messages screen for every role: conversation list + live thread.
// `?c=<id>` opens a conversation directly (links from notifications). Report and
// Block are for the people in the chat; admins moderate from Chat reports instead.
export function MessagesInbox({ showSafety }: { showSafety: boolean }) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? 0)
  const searchParams = useSearchParams()
  const { items: conversations, hasMore, loadingMore, loadMore, isLoading } = useConversationsList()
  const [activeId, setActiveId] = useState<number | null>(() => Number(searchParams.get("c")) || null)

  if (activeId) {
    return (
      <ChatThread
        conversationId={activeId}
        currentUserId={currentUserId}
        onBack={() => setActiveId(null)}
        showSafety={showSafety}
      />
    )
  }

  if (!isLoading && conversations.length === 0) {
    return <EmptyState title="No conversations yet" description="Your chats will appear here." />
  }

  return (
    <ul className="divide-y divide-black/10">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => setActiveId(c.id)}
            className="flex w-full items-center gap-3 px-1 py-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-[#101217]">{participantName(c)}</span>
              <span className="block text-xs text-[#8a8d93]">
                {ROLE_LABEL[c.other_participant?.role ?? ""] ?? "B.A.Y.D"}
                {c.last_message_at ? ` · ${new Date(c.last_message_at).toLocaleString()}` : ""}
              </span>
            </span>
            {c.unread_count > 0 && (
              <span className="rounded-full bg-[#c96c83] px-2 py-0.5 text-xs font-bold text-white">{c.unread_count}</span>
            )}
          </button>
        </li>
      ))}
      {hasMore ? (
        <li className="pt-3">
          <Button className="w-full" disabled={loadingMore} onClick={loadMore} variant="outline">
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </li>
      ) : null}
    </ul>
  )
}

function ChatThread({
  conversationId,
  currentUserId,
  onBack,
  showSafety,
}: {
  conversationId: number
  currentUserId: number
  onBack: () => void
  showSafety: boolean
}) {
  const { data: conversation } = useConversation(conversationId)
  const { messages, hasEarlier, loadingEarlier, loadEarlier, otherTyping, otherOnline, send, setTyping } = useChat(
    conversationId,
    currentUserId,
  )
  const newestId = messages[messages.length - 1]?.id
  const listRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState("")
  const { toast } = useToast()
  const name = conversation ? participantName(conversation) : "…"
  const blocked = !!(conversation?.blocked_by_me || conversation?.blocked_me)

  // Follow the newest message (not older history loaded above it).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [newestId, otherTyping])

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    setTyping(false)
    try {
      await send(body)
    } catch (e) {
      setDraft(body)
      toast({ title: "Message not sent", description: apiError(e, "Message not sent. Please try again."), variant: "error" })
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="mb-2 flex items-center gap-2 border-b border-black/10 pb-2">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1">
          <ArrowLeft className="size-5" />
        </button>
        <span className="font-bold text-[#101217]">{name}</span>
        <span className={`text-xs ${otherOnline ? "text-green-600" : "text-[#8a8d93]"}`}>
          {otherOnline ? "online" : "offline"}
        </span>
        {showSafety && conversation ? (
          <span className="ml-auto flex gap-2">
            <ReportButton conversationId={conversationId} name={name} />
            <BlockButton conversationId={conversationId} name={name} blockedByMe={!!conversation.blocked_by_me} />
          </span>
        ) : null}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto py-2">
        <LoadEarlier hasEarlier={hasEarlier} loading={loadingEarlier} loadEarlier={loadEarlier} scrollRef={listRef} />
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-[#c96c83] text-white" : "bg-black/5 text-[#101217]"
                }`}
              >
                {m.image_url && <ChatPhoto url={m.image_url} />}
                {m.body}
                {mine && m.read_at && <span className="ml-2 text-[10px] opacity-80">Read</span>}
              </div>
            </div>
          )
        })}
        {otherTyping && <p className="text-xs italic text-[#8a8d93]">typing…</p>}
        <div ref={endRef} />
      </div>

      {blocked ? (
        <p className="border-t border-black/10 pt-3 text-center text-sm text-[#8a8d93]">
          {conversation?.blocked_by_me
            ? `You blocked ${name}. Unblock to send messages again.`
            : "You can't reply to this conversation."}
        </p>
      ) : (
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
      )}
    </div>
  )
}

function ReportButton({ conversationId, name }: { conversationId: number; name: string }) {
  const { toast } = useToast()
  const report = useReportConversation(conversationId)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState("")

  function submit() {
    report.mutate(
      { reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          setDetails("")
          toast({ title: "Report sent", description: "Our team reviews it within 24 hours.", variant: "success" })
        },
        onError: (e) => toast({ title: "Report not sent", description: apiError(e), variant: "error" }),
      },
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="xs" variant="outline">
          <Flag className="mr-1 size-3.5" /> Report
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report {name}</AlertDialogTitle>
          <AlertDialogDescription>
            {`Our team is told and reviews the conversation. ${name} isn't told about your report.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-[#101217]">
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
          <textarea
            rows={3}
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Anything else we should know (optional)"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#c96c83]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={report.isPending} onClick={submit}>
            Send report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function BlockButton({ conversationId, name, blockedByMe }: { conversationId: number; name: string; blockedByMe: boolean }) {
  const { toast } = useToast()
  const setBlocked = useSetBlocked(conversationId)

  function toggle() {
    setBlocked.mutate(!blockedByMe, {
      onSuccess: () => toast({ title: blockedByMe ? `${name} unblocked` : `${name} blocked`, variant: "success" }),
      onError: (e) => toast({ title: "Couldn't update", description: apiError(e), variant: "error" }),
    })
  }

  if (blockedByMe) {
    return (
      <Button size="xs" variant="outline" disabled={setBlocked.isPending} onClick={toggle}>
        Unblock
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="xs" variant="outline">
          <Ban className="mr-1 size-3.5" /> Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Neither of you will be able to send messages in this chat. ${name} isn't told. You can unblock any time.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={toggle}>Block</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
