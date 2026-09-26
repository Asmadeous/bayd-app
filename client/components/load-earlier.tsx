"use client"

import type { RefObject } from "react"

import { BubbleLoader } from "@/components/bubble-loader"

// "Load earlier messages" at the top of a chat. Keeps the reader where they were
// after the older messages are added above.
export function LoadEarlier({
  hasEarlier,
  loading,
  loadEarlier,
  scrollRef,
}: {
  hasEarlier: boolean
  loading: boolean
  loadEarlier: () => Promise<void>
  scrollRef: RefObject<HTMLElement | null>
}) {
  if (!hasEarlier) return null
  if (loading) return <BubbleLoader className="py-2" />

  async function load() {
    const el = scrollRef.current
    const before = el?.scrollHeight ?? 0
    await loadEarlier()
    requestAnimationFrame(() => {
      if (el) el.scrollTop += el.scrollHeight - before
    })
  }

  return (
    <button
      type="button"
      onClick={load}
      className="mx-auto mb-2 block rounded-full bg-[#C96C83]/10 px-4 py-2 text-xs font-bold text-[#9E4A60]"
    >
      Load earlier messages
    </button>
  )
}
