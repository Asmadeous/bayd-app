"use client"

import { CalendarDays, List } from "lucide-react"

import { cn } from "@/lib/utils"

export type BookingView = "list" | "calendar"

const VIEWS = [
  { key: "list", label: "List view", icon: List },
  { key: "calendar", label: "Calendar view", icon: CalendarDays },
] as const

// How bookings are laid out (list or calendar), separate from which ones
// are shown (upcoming / past).
export function ViewSwitch({ value, onChange }: { value: BookingView; onChange: (view: BookingView) => void }) {
  return (
    <div className="flex shrink-0 rounded-xl bg-black/[0.05] p-1" role="group" aria-label="View">
      {VIEWS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={label}
          aria-pressed={value === key}
          className={cn(
            "grid size-9 place-items-center rounded-lg transition-colors",
            value === key ? "bg-white text-[#14100F] shadow-sm" : "text-[#14100F]/45",
          )}
        >
          <Icon className="size-[1.05rem]" aria-hidden />
        </button>
      ))}
    </div>
  )
}

// Upcoming / Past, for the list view.
export function WhenFilter({
  value,
  onChange,
}: {
  value: "upcoming" | "past"
  onChange: (when: "upcoming" | "past") => void
}) {
  return (
    <div className="flex flex-1 rounded-xl bg-black/[0.05] p-1" role="group" aria-label="Show">
      {(["upcoming", "past"] as const).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-bold capitalize transition-colors",
            value === key ? "bg-white text-[#14100F] shadow-sm" : "text-[#14100F]/50",
          )}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
