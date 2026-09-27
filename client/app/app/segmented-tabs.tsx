"use client"

import { cn } from "@/lib/utils"

// The pill switch at the top of a tab that holds several lists (Management, Chat).
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
}) {
  return (
    <div
      className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex-auto shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[0.8125rem] font-semibold transition-colors",
            value === t.key ? "bg-[#101217] text-white" : "text-[#101217]/55",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
