"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { appScreenClass, displayClass } from "./app-theme"

// App-native section shell: a back header + paper background + bottom-nav room.
// Content is a purpose-built mobile screen (its own list UI on the data hooks) -
// NOT a reused desktop dashboard page.
export function SectionScreen({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className={appScreenClass}>
      <header className="flex items-center gap-3 px-4 pb-2 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className={`${displayClass} text-2xl leading-tight`}>{title}</h1>
      </header>
      <div className="px-5">{children}</div>
    </div>
  )
}
