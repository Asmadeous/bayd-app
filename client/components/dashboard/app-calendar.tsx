"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Booking } from "@/lib/hooks/use-bookings"

const STATUS_COLORS: Record<string, string> = {
  pending: "#d4a843",
  confirmed: "#c96c83",
  in_progress: "#d4a843",
  completed: "#5a9e5a",
  cancelled: "#8a8d93",
  no_show: "#d4754a",
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface AppCalendarProps {
  bookings: Booking[]
  onSelectDay?: (date: Date, bookings: Booking[]) => void
}

export function AppCalendar({ bookings, onSelectDay }: AppCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(today.getDate())

  // Map from "YYYY-MM-DD" → bookings[]
  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      const key = b.starts_at.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(b)
      map.set(key, arr)
    }
    return map
  }, [bookings])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setSelected(null)
  }

  function handleDay(day: number) {
    setSelected(day)
    if (onSelectDay) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      onSelectDay(new Date(year, month, day), bookingMap.get(key) ?? [])
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" })

  // cells: null = blank, number = day
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
        <button
          onClick={prevMonth}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-[#5f6268]"
          aria-label="Previous month"
        >
          <ChevronLeft />
        </button>
        <span className="font-semibold text-sm text-[#101217]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-[#5f6268]"
          aria-label="Next month"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 pt-3">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-[#5f6268] pb-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayBookings = bookingMap.get(key) ?? []
          const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isSelected = selected === day

          return (
            <button
              key={day}
              onClick={() => handleDay(day)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors",
                isSelected ? "bg-[#101217]" : isToday ? "bg-[#f4f1eb]" : "hover:bg-black/4"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium leading-none",
                  isSelected ? "text-white" : isToday ? "text-[#c96c83] font-bold" : "text-[#101217]"
                )}
              >
                {day}
              </span>
              {/* Up to 3 status dots */}
              {dayBookings.length > 0 && (
                <div className="flex gap-0.5">
                  {dayBookings.slice(0, 3).map((b, idx) => (
                    <span
                      key={idx}
                      className="block size-1.5 rounded-full"
                      style={{ background: isSelected ? "#fff" : STATUS_COLORS[b.status] ?? "#c96c83" }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-black/6 text-xs text-[#5f6268]">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className="block size-2 rounded-full" style={{ background: color }} />
            {status.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
