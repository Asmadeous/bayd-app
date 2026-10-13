"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Send } from "lucide-react"

import { ChatAvatar } from "@/components/chat/chat-avatar"

// The full-screen chat layout shared by Messages and Support chat: a header
// with back, avatar and status, the scrolling messages, and the reply bar.
export function ThreadHeader({
  name,
  avatarUrl,
  status,
  action,
}: {
  name: string
  avatarUrl?: string | null
  status?: string
  action?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <header className="flex items-center gap-3 border-b border-black/5 bg-white px-3 py-2.5">
      <button type="button" onClick={() => router.back()} aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F4F2EF]">
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <ChatAvatar name={name} url={avatarUrl} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-[#14100F]">{name}</p>
        {status ? <p className="truncate text-sm font-medium text-[#C96C83]">{status}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function ReplyBar({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Message…",
  onBlur,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  placeholder?: string
  onBlur?: () => void
}) {
  return (
    <div className="border-t border-black/5 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder={placeholder}
          aria-label="Reply"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-black/10 bg-[#F4F2EF] px-4 py-2.5 text-base text-[#14100F] outline-none placeholder:text-[#14100F]/35 focus:border-[#C96C83]"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#C96C83] text-white transition-opacity disabled:opacity-40"
        >
          <Send className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export const threadScreenClass = "fixed inset-0 flex flex-col bg-[#F4F2EF] pt-[var(--top-inset)]"
