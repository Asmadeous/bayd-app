"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { addDays, bookingDateKey, formatDateKey, todayKey, type DateKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import type { CalendarState } from "@/lib/hooks/use-calendar-state"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]

const DOT: Record<Booking["status"], string> = {
  pending: "bg-[#D4A843]",
  confirmed: "bg-[#C96C83]",
  in_progress: "bg-[#D4A843]",
  completed: "bg-[#4E9A57]",
  cancelled: "bg-[#14100F]/25",
  no_show: "bg-[#D4754A]",
  missed: "bg-[#14100F]",
}

// Phone month grid for the apps: a dot per booking, tap a day to pick it. The
// parent shows that day's appointments with its own cards (so every existing
// action comes along) and owns the range via useCalendarState("month").
export function MonthAgenda({
  state,
  bookings,
  selected,
  onSelect,
}: {
  state: CalendarState
  bookings: Booking[]
  selected: DateKey
  onSelect: (day: DateKey) => void
}) {
  const byDay = useMemo(() => {
    const map = new Map<DateKey, Booking[]>()
    for (const b of bookings) {
      const key = bookingDateKey(b.starts_at)
      map.set(key, [...(map.get(key) ?? []), b])
    }
    return map
  }, [bookings])

  const month = state.cursor.slice(0, 7)
  const today = todayKey()
  const days = Array.from({ length: 42 }, (_, i) => addDays(state.from, i))

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={state.prev} aria-label="Previous month" className="grid size-9 place-items-center rounded-full hover:bg-black/5">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="text-sm font-extrabold text-[#14100F]" aria-live="polite">
          {formatDateKey(`${month}-01`, { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={state.next} aria-label="Next month" className="grid size-9 place-items-center rounded-full hover:bg-black/5">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-[0.65rem] font-bold text-[#14100F]/40">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const list = byDay.get(day) ?? []
          const isSelected = day === selected
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${formatDateKey(day, { weekday: "long", month: "long", day: "numeric" })}, ${list.length} appointment${list.length === 1 ? "" : "s"}`}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-sm",
                isSelected ? "bg-[#14100F] text-white" : day === today ? "font-extrabold text-[#C96C83]" : "",
                !day.startsWith(month) && !isSelected && "text-[#14100F]/30",
              )}
            >
              {Number(day.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {list.slice(0, 3).map((b) => (
                  <span key={b.id} className={cn("size-1.5 rounded-full", isSelected ? "bg-white" : DOT[b.status])} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
