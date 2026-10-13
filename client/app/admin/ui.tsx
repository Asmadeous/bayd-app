"use client"

import { cn } from "@/lib/utils"
import { cardClass, mutedClass } from "./admin-theme"

// Pieces every admin list screen uses: a row of filter chips, a Prev/Next
// pager and an empty-state card.

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label = (v) => v.replace(/_/g, " ") || "All",
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label?: (value: T) => string
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {options.map((o) => (
        <button
          key={o || "all"}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold capitalize",
            value === o ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
          )}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}

export function Pager({ page, totalPages, hasNext, onPage }: { page: number; totalPages?: number; hasNext: boolean; onPage: (page: number) => void }) {
  if (!totalPages || totalPages <= 1) return null
  const button = "rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40"
  return (
    <div className="flex items-center justify-between pt-1">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={button}>
        Prev
      </button>
      <span className={`text-sm ${mutedClass}`}>
        {page} / {totalPages}
      </span>
      <button type="button" disabled={!hasNext} onClick={() => onPage(page + 1)} className={button}>
        Next
      </button>
    </div>
  )
}

export function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${cardClass} p-5`}>
      <p className="text-base font-bold">{title}</p>
      <p className={`mt-1 text-sm ${mutedClass}`}>{body}</p>
    </div>
  )
}

export function apiError(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base text-[#14100F] outline-none focus:border-[#C96C83]"
