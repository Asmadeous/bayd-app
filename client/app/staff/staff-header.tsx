"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { displayClass } from "./staff-theme"

// Lightweight staff screen header: heavy title and a right-side action on one
// line. App-native, used at the top of each staff tab. Screens opened from
// another screen (not a tab) pass `back` for a way back. The home tab passes
// `greeting` (the tech's name) instead of a title: "Hello, <name>", on one line
// unless the name is long.
export function StaffHeader({
  title,
  action,
  back,
  greeting,
}: {
  title?: string
  action?: React.ReactNode
  back?: boolean
  greeting?: string
}) {
  const router = useRouter()
  return (
    <header
      className={`flex items-center justify-between gap-3 px-5 pb-3 ${
        greeting ? "pt-[calc(2.75rem+var(--top-inset))]" : "pt-[calc(1.25rem+var(--top-inset))]"
      }`}
    >
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
      {greeting ? (
        <h1 className={`${displayClass} min-w-0 flex-1 break-words text-[2.2rem] leading-tight tracking-[-0.02em]`}>
          Hello, <span className="text-[#C96C83]">{greeting}</span>
        </h1>
      ) : (
        // truncate clips to the line box, so a tight line height cuts off g/y/p.
        <h1 className={`${displayClass} min-w-0 flex-1 truncate text-[1.9rem] leading-tight`}>{title}</h1>
      )}
      {action}
    </header>
  )
}
