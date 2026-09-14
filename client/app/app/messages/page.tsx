"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { MessageCircle } from "lucide-react"

import api from "@/lib/api"
import type { Conversation } from "@/lib/cable/chat-types"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { appScreenClass, cardClass, mutedClass } from "../app-theme"
import { AppHeader } from "../app-header"

// The customer's conversation list - purpose-built mobile screen on the shared
// GET /conversations contract. Tapping a row opens the live thread.
export default function MessagesScreen() {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/conversations").then((r) => r.data),
  })

  return (
    <div className={appScreenClass}>
      <AppHeader title="Messages" subtitle="Chat with your technician and the B.A.Y.D team." />

      <div className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <MessageCircle className="size-8 text-[#c96c83]" aria-hidden />
            <p className="font-bold">No conversations yet</p>
            <p className={`text-sm ${mutedClass}`}>
              Open a booking and tap Message to reach your technician.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <ConversationRow key={c.id} conversation={c} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
  const name =
    [c.other_participant?.first_name, c.other_participant?.last_name].filter(Boolean).join(" ") ||
    "B.A.Y.D"
  const initial = (c.other_participant?.first_name ?? "B").charAt(0).toUpperCase()

  return (
    <li>
      <Link
        href={`/app/messages/thread?id=${c.id}`}
        className={`${cardClass} flex items-center gap-3 p-4`}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0ece4] text-base font-bold text-[#c96c83]">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-[#101217]">{name}</span>
            {c.last_message_at && (
              <span className={`shrink-0 text-xs ${mutedClass}`}>
                {formatBookingDate(c.last_message_at, { month: "short", day: "numeric" })}
                {" · "}
                {formatBookingTime(c.last_message_at)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-sm capitalize ${mutedClass}`}>
              {c.other_participant?.role ?? "team"}
            </span>
            {c.unread_count > 0 && (
              <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#c96c83] px-1.5 text-xs font-bold text-white">
                {c.unread_count}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}
