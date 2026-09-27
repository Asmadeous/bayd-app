"use client"

import Link from "next/link"
import { MessageCircle } from "lucide-react"

import { ChatAvatar } from "@/components/chat/chat-avatar"
import { LoadMore } from "@/components/load-more"
import { useConversationsList } from "@/lib/hooks/use-conversations"
import type { Conversation } from "@/lib/cable/chat-types"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { staffScreenClass, cardClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

// A technician's conversation list - purpose-built mobile screen on the shared
// GET /conversations contract. Tapping a row opens the live thread.
export default function StaffMessagesScreen() {
  const { items: conversations, isLoading, hasMore, loadingMore, loadMore } = useConversationsList()

  return (
    <div className={staffScreenClass}>
      <StaffHeader title="Messages" />

      <div className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <MessageCircle className="size-8 text-[#C96C83]" aria-hidden />
            <p className="font-bold">No conversations yet</p>
            <p className={`text-sm ${mutedClass}`}>
              Messages from your clients and the team will appear here.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
            {conversations.map((c) => (
              <ConversationRow key={c.id} conversation={c} />
            ))}
            </ul>
            <LoadMore className="mt-3" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
          </>
        )}
      </div>
    </div>
  )
}

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
  const name =
    [c.other_participant?.first_name, c.other_participant?.last_name].filter(Boolean).join(" ") ||
    "B.A.Y.D"

  return (
    <li>
      <Link href={`/staff/messages/thread?id=${c.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
        <ChatAvatar name={c.other_participant?.first_name} url={c.other_participant?.avatar_url} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-[#14100F]">{name}</span>
            {c.last_message_at && (
              <span className={`shrink-0 text-sm ${mutedClass}`}>
                {formatBookingDate(c.last_message_at, { month: "short", day: "numeric" })}
                {" · "}
                {formatBookingTime(c.last_message_at)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${mutedClass}`}>
              {roleLabel(c.other_participant?.role)}
            </span>
            {c.unread_count > 0 && (
              <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#C96C83] px-1.5 text-sm font-bold text-white">
                {c.unread_count}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

function roleLabel(role?: string) {
  if (role === "employee") return "Technician"
  if (role === "customer") return "Client"
  return "B.A.Y.D team"
}
