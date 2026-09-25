"use client"

import type { ReactNode } from "react"
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Booking } from "@/lib/hooks/use-bookings"
import { bookingDateKey } from "@/lib/booking-time"

export const STATUS_COLORS: Record<string, string> = {
  pending: "#d4a843",
  confirmed: "#c96c83",
  in_progress: "#d4a843",
  completed: "#5a9e5a",
  cancelled: "#8a8d93",
  no_show: "#d4754a",
  missed: "#101217",
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface AppCalendarProps {
  bookings: Booking[]
  footer?: ReactNode
  onSelectDay?: (date: Date, bookings: Booking[]) => void
}

export function AppCalendar({ bookings, footer, onSelectDay }: AppCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(today.getDate())

  // Map from "YYYY-MM-DD" → bookings[]
  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      const key = bookingDateKey(b.starts_at)
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
    <div className="overflow-hidden border border-black/10 bg-white shadow-sm shadow-black/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/6 bg-[#fbfaf7] px-5 py-4">
        <button
          onClick={prevMonth}
          className="flex size-9 items-center justify-center border border-black/10 bg-white text-[#5f6268] transition-colors hover:border-[#c96c83]/35 hover:text-[#101217]"
          aria-label="Previous month"
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <span className="font-heading text-xl font-extrabold text-[#101217]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="flex size-9 items-center justify-center border border-black/10 bg-white text-[#5f6268] transition-colors hover:border-[#c96c83]/35 hover:text-[#101217]"
          aria-label="Next month"
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 pt-4">
        {DAYS.map((d) => (
          <div key={d} className="pb-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6b6f76]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 px-3 pb-4">
        {cells.map((day, i) => {
          if (!day) return <div aria-hidden="true" className="min-h-12" key={`blank-${i}`} />
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
                "relative flex min-h-12 flex-col items-center justify-center gap-1 border border-transparent py-2 transition-colors",
                isSelected
                  ? "border-[#101217] bg-[#101217]"
                  : isToday
                    ? "border-[#c96c83]/25 bg-[#f4f1eb]"
                    : "hover:border-black/10 hover:bg-[#fbfaf7]"
              )}
              type="button"
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
      <div className="flex flex-wrap gap-2 border-t border-black/6 bg-[#fbfaf7] px-5 py-3 text-xs text-[#5f6268]">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex min-h-7 items-center gap-1.5 border border-black/6 bg-white px-2 capitalize">
            <span className="block size-2 rounded-full" style={{ background: color }} />
            {status.replace("_", " ")}
          </span>
        ))}
      </div>

      {footer ? <div className="border-t border-black/6 bg-white px-5 py-4">{footer}</div> : null}
    </div>
  )
}
