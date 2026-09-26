"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { displayClass, mutedClass } from "./staff-theme"

// Lightweight staff screen header: heavy title + optional subtitle and a
// right-side action. App-native, used at the top of each staff tab. Screens
// opened from another screen (not a tab) pass `back` for a way back, and the
// home tab passes `greeting` (the tech's name) for a "Hello, ..." line.
export function StaffHeader({
  title,
  subtitle,
  action,
  back,
  greeting,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  back?: boolean
  greeting?: string
}) {
  const router = useRouter()
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-[calc(1.25rem+var(--top-inset))]">
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 shrink-0 place-items-center self-start rounded-full bg-white shadow-sm"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {greeting && (
          <p className={`${displayClass} mb-1 truncate text-xl`}>
            Hello, <span className="text-[#C96C83]">{greeting}</span>
          </p>
        )}
        <h1 className={`${displayClass} truncate text-[1.9rem] leading-[1.05]`}>{title}</h1>
        {subtitle && <p className={`mt-1 truncate text-sm ${mutedClass}`}>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
