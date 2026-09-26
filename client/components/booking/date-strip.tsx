"use client"

import { useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { addDays, formatDateKey, todayKey, weekdayOf, type DateKey } from "@/lib/booking-time"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

// The week shown first for a day: Sunday to Saturday.
export function weekRange(day: DateKey) {
  const from = startOfWeek(day)
  return { from, to: addDays(from, 6) }
}

// Square-style date picker: one week at a time with arrows, expandable to the
// whole month. For booking, days before today can't be picked; calendars pass
// `allowPast`, a dot per day with bookings (`marks`), and get told which days
// are on screen so they can load them.
export function DateStrip({
  value,
  onChange,
  allowPast = false,
  marks,
  onVisibleRangeChange,
}: {
  value: DateKey
  onChange: (day: DateKey) => void
  allowPast?: boolean
  marks?: Set<DateKey>
  onVisibleRangeChange?: (from: DateKey, to: DateKey) => void
}) {
  const today = todayKey()
  const [expanded, setExpanded] = useState(false)
  // Collapsed: the Sunday that starts the week shown. Expanded: the 1st of the
  // month shown (the grid starts on the Sunday before it).
  const [anchor, setAnchor] = useState(() => startOfWeek(value || today))

  const first = expanded ? startOfWeek(anchor) : anchor
  const days = Array.from({ length: expanded ? 42 : 7 }, (_, i) => addDays(first, i))
  const heading = formatDateKey(expanded ? anchor : addDays(anchor, 3), { month: "short", year: "numeric" })
  const canGoBack = allowPast || (expanded ? anchor.slice(0, 7) > today.slice(0, 7) : anchor > startOfWeek(today))

  function show(nextAnchor: DateKey, nextExpanded: boolean) {
    setAnchor(nextAnchor)
    setExpanded(nextExpanded)
    const from = nextExpanded ? startOfWeek(nextAnchor) : nextAnchor
    onVisibleRangeChange?.(from, addDays(from, nextExpanded ? 41 : 6))
  }

  function shift(direction: 1 | -1) {
    show(expanded ? shiftMonth(anchor, direction) : addDays(anchor, 7 * direction), expanded)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-black tracking-tight" aria-live="polite">{heading}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={!canGoBack}
            aria-label={expanded ? "Previous month" : "Previous week"}
            className="grid size-9 place-items-center rounded-full bg-black/[0.05] transition-colors hover:bg-black/10 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={expanded ? "Next month" : "Next week"}
            className="grid size-9 place-items-center rounded-full bg-black/[0.05] transition-colors hover:bg-black/10"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-[11px] font-bold text-[#8a8d93]">{d}</span>
        ))}
        {days.map((day) => {
          const past = !allowPast && day < today
          const active = day === value
          const outside = expanded && day.slice(0, 7) !== anchor.slice(0, 7)
          return (
            <button
              key={day}
              type="button"
              disabled={past}
              onClick={() => onChange(day)}
              aria-pressed={active}
              aria-label={`${formatDateKey(day, { weekday: "long", month: "long", day: "numeric" })}${marks?.has(day) ? ", has bookings" : ""}`}
              className={cn(
                "mx-auto grid size-10 place-items-center rounded-xl text-sm font-bold transition-colors",
                active ? "bg-[#101217] text-white" : "hover:bg-black/[0.05]",
                past && "cursor-not-allowed text-[#101217]/25 hover:bg-transparent",
                outside && !active && !past && "text-[#101217]/40",
                day === today && !active && "text-[#c96c83]",
              )}
            >
              <span className="relative">
                {Number(day.slice(8))}
                {marks?.has(day) ? (
                  <span
                    aria-hidden
                    className={cn("absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full", active ? "bg-white" : "bg-[#c96c83]")}
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const day = value || today
          show(expanded ? startOfWeek(day) : `${day.slice(0, 7)}-01`, !expanded)
        }}
        aria-label={expanded ? "Show one week" : "Show the whole month"}
        className="mx-auto mt-2 grid size-8 place-items-center rounded-full transition-colors hover:bg-black/[0.05]"
      >
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
      </button>
    </div>
  )
}

function startOfWeek(day: DateKey): DateKey {
  return addDays(day, -weekdayOf(day))
}

function shiftMonth(day: DateKey, direction: 1 | -1): DateKey {
  const [y, m] = day.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + direction, 1))
  return d.toISOString().slice(0, 10)
}
