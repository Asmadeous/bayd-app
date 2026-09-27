"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { displayClass } from "./app-theme"

// A lightweight in-app screen header: an editorial serif title and an optional
// right-side action. App-native (no website nav), used at the top of each tab
// screen. Screens opened from a tab (not a tab themselves) pass `back`, the same
// header the staff app's Manage screens use.
export function AppHeader({
  title,
  action,
  back,
}: {
  title: string
  action?: React.ReactNode
  back?: boolean
}) {
  const router = useRouter()
  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-[calc(1.25rem+var(--top-inset))]">
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {/* truncate clips to the line box, so a tight line height cuts off g/y/p. */}
      <h1 className={`${displayClass} min-w-0 flex-1 truncate text-[2rem] leading-tight tracking-[-0.01em]`}>
        {title}
      </h1>
      {action}
    </header>
  )
}
