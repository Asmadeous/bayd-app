"use client"

import Link from "next/link"
import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageCircle } from "lucide-react"

import { ChatAvatar } from "@/components/chat/chat-avatar"
import { LoadMore } from "@/components/load-more"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import type { Conversation } from "@/lib/cable/chat-types"
import { useConversationsList } from "@/lib/hooks/use-conversations"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"

const ROLE_LABEL: Record<string, string> = {
  customer: "Client",
  employee: "Technician",
  partner: "Partner",
  admin: "B.A.Y.D team",
}

export default function AdminMessagesScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <Messages />
    </Suspense>
  )
}

// The web Messages page: conversations admins started from Customers, and
// their replies. `?c=<id>` (the web's deep link) opens that thread.
function Messages() {
  const router = useRouter()
  const linked = Number(useSearchParams().get("c"))
  const { items: conversations, isLoading, hasMore, loadingMore, loadMore } = useConversationsList()

  useEffect(() => {
    if (linked > 0) router.replace(`/admin/messages/thread?id=${linked}`)
  }, [linked, router])

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Messages" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Conversations you started from Customers, and their replies.</p>
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
            <p className={`text-sm ${mutedClass}`}>Message someone from their account under Customers.</p>
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
  const name = [c.other_participant?.first_name, c.other_participant?.last_name].filter(Boolean).join(" ") || "B.A.Y.D"
  return (
    <li>
      <Link href={`/admin/messages/thread?id=${c.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
        <ChatAvatar name={c.other_participant?.first_name} url={c.other_participant?.avatar_url} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{name}</span>
            {c.last_message_at ? (
              <span className={`shrink-0 text-sm ${mutedClass}`}>
                {formatBookingDate(c.last_message_at, { month: "short", day: "numeric" })} · {formatBookingTime(c.last_message_at)}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${mutedClass}`}>{ROLE_LABEL[c.other_participant?.role ?? ""] ?? "B.A.Y.D"}</span>
            {c.unread_count > 0 ? (
              <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#C96C83] px-1.5 text-sm font-bold text-white">{c.unread_count}</span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  )
}
