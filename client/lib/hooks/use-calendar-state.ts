"use client"

import { useMemo, useState } from "react"

import { addDays, todayKey, weekdayOf, type DateKey } from "@/lib/booking-time"

export type CalendarView = "month" | "week" | "day"

// Where a calendar is looking (view + a date inside it) and the exact range of
// days on screen, which is what the booking range hooks fetch. Month shows the
// 6-week grid around the month, so leading/trailing days carry bookings too.
export function useCalendarState(initialView: CalendarView = "month") {
  const [view, setView] = useState<CalendarView>(initialView)
  const [cursor, setCursor] = useState<DateKey>(() => todayKey())

  const { from, to } = useMemo(() => {
    if (view === "day") return { from: cursor, to: cursor }
    if (view === "week") {
      const start = addDays(cursor, -weekdayOf(cursor))
      return { from: start, to: addDays(start, 6) }
    }
    const first = `${cursor.slice(0, 7)}-01`
    const start = addDays(first, -weekdayOf(first))
    return { from: start, to: addDays(start, 41) }
  }, [view, cursor])

  function step(direction: 1 | -1) {
    if (view === "day") setCursor((c) => addDays(c, direction))
    else if (view === "week") setCursor((c) => addDays(c, 7 * direction))
    else
      setCursor((c) => {
        const [y, m] = c.split("-").map(Number)
        const d = new Date(Date.UTC(y, m - 1 + direction, 1))
        return d.toISOString().slice(0, 10)
      })
  }

  return {
    view,
    setView,
    cursor,
    setCursor,
    from,
    to,
    next: () => step(1),
    prev: () => step(-1),
    today: () => setCursor(todayKey()),
    // Open one day in Day view (e.g. from a month cell or "+N more").
    openDay: (key: DateKey) => {
      setCursor(key)
      setView("day")
    },
  }
}

export type CalendarState = ReturnType<typeof useCalendarState>
