"use client"

import { useState } from "react"

import { formatBookingTime, nowLocalMinutes, todayKey, type DateKey } from "@/lib/booking-time"
import { gridHours, layoutDay } from "@/lib/calendar-layout"
import type { Booking } from "@/lib/hooks/use-bookings"
import { cn } from "@/lib/utils"

const HOUR_PX = 64

const BLOCK: Record<Booking["status"], string> = {
  pending: "border-[#D4A843] bg-[#D4A843]/15",
  confirmed: "border-[#C96C83] bg-[#C96C83]/12",
  in_progress: "border-[#D4A843] bg-[#D4A843]/20",
  completed: "border-[#4E9A57] bg-[#4E9A57]/12",
  cancelled: "border-black/25 bg-black/[0.04] opacity-60",
  no_show: "border-[#D4754A] bg-[#D4754A]/12",
  missed: "border-black/40 bg-black/[0.06]",
}

// One day as a Google-Calendar-style hour grid: each booking is a block from its
// start to its end (overlaps share the width), with a "now" line on today. Tap a
// block to open that appointment.
export function DayTimeline({
  day,
  bookings,
  who,
  onOpen,
}: {
  day: DateKey
  bookings: Booking[]
  who: (booking: Booking) => string | null | undefined
  onOpen: (booking: Booking) => void
}) {
  const [nowMin] = useState(() => nowLocalMinutes())
  const placed = layoutDay(bookings)
  const { startHour, endHour } = gridHours(placed)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX
  const showNow = day === todayKey() && nowMin >= startHour * 60 && nowMin <= endHour * 60

  return (
    <div className="relative rounded-2xl border border-black/5 bg-white py-2 pr-2" style={{ height: hours.length * HOUR_PX + 16 }}>
      {hours.map((h) => (
        <div key={h} className="absolute left-0 right-0 flex" style={{ top: 8 + (h - startHour) * HOUR_PX }}>
          <span className="w-14 shrink-0 -translate-y-1/2 pr-2 text-right text-[0.65rem] font-semibold text-[#14100F]/40">
            {hourLabel(h)}
          </span>
          <span className="h-px flex-1 bg-black/[0.07]" />
        </div>
      ))}

      <div className="absolute bottom-2 left-14 right-2 top-2">
        {placed.map(({ booking, startMin, endMin, column, columns }) => {
          const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 30)
          const compact = height < 52
          return (
            <button
              key={booking.id}
              type="button"
              onClick={() => onOpen(booking)}
              className={cn(
                "absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left transition-transform active:scale-[0.98]",
                BLOCK[booking.status],
              )}
              style={{
                top: top(startMin),
                height: height - 2,
                left: `calc(${(column / columns) * 100}% + 2px)`,
                width: `calc(${100 / columns}% - 4px)`,
              }}
            >
              <span className="block truncate text-xs font-extrabold text-[#14100F]">
                {booking.service?.name}
                {compact && who(booking) ? <span className="font-semibold text-[#14100F]/60"> · {who(booking)}</span> : null}
              </span>
              {!compact ? (
                <>
                  <span className="block truncate text-[0.7rem] font-semibold text-[#14100F]/60">
                    {formatBookingTime(booking.starts_at)} – {formatBookingTime(booking.ends_at)}
                  </span>
                  {who(booking) ? <span className="block truncate text-[0.7rem] text-[#14100F]/60">{who(booking)}</span> : null}
                </>
              ) : null}
            </button>
          )
        })}

        {showNow ? (
          <div aria-hidden className="pointer-events-none absolute left-0 right-0 flex items-center" style={{ top: top(nowMin) }}>
            <span className="-ml-1.5 size-3 rounded-full bg-[#D93025]" />
            <span className="h-0.5 flex-1 bg-[#D93025]" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}
