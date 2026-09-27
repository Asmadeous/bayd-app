"use client"

import { useEffect, useRef, useState } from "react"

import { formatTime } from "@/components/booking/time-groups"
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

const SLOT_MIN = 30
const HOLD_MS = 400
const SNAP_MIN = 15
// Movement allowed during the hold before it counts as a scroll instead.
const HOLD_SLOP_PX = 8
const MOVABLE = new Set<Booking["status"]>(["pending", "confirmed"])

type Drag = { id: number; startY: number; deltaMin: number; active: boolean }

// One day as a Google-Calendar-style hour grid: each booking is a block from its
// start to its end (overlaps share the width), with a "now" line on today. Tap a
// block to open that appointment. With onSlot, each open half hour (not already
// past) is tappable too, for booking that time. With onMove, a pending or
// confirmed block can be pressed and held, then dragged to a new time on the same
// day (snapping to 15 minutes); onMove decides whether it really moves.
export function DayTimeline({
  day,
  bookings,
  who,
  onOpen,
  onSlot,
  onMove,
}: {
  day: DateKey
  bookings: Booking[]
  who: (booking: Booking) => string | null | undefined
  onOpen: (booking: Booking) => void
  onSlot?: (time: string) => void
  onMove?: (booking: Booking, newStart: string) => Promise<void>
}) {
  const [nowMin] = useState(() => nowLocalMinutes())
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const holdTimer = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const updateDrag = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  // React's touch listeners are passive, so a held drag would scroll the page.
  // A native non-passive listener stops the scroll only while dragging.
  useEffect(() => {
    const el = gridRef.current
    if (!el || !onMove) return
    const block = (e: TouchEvent) => {
      if (dragRef.current?.active) e.preventDefault()
    }
    el.addEventListener("touchmove", block, { passive: false })
    return () => el.removeEventListener("touchmove", block)
  }, [onMove])
  const placed = layoutDay(bookings)
  const { startHour, endHour } = gridHours(placed)
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX
  const showNow = day === todayKey() && nowMin >= startHour * 60 && nowMin <= endHour * 60
  const slotStarts = onSlot
    ? Array.from({ length: ((endHour - startHour) * 60) / SLOT_MIN }, (_, i) => startHour * 60 + i * SLOT_MIN).filter(
        (min) => day > todayKey() || (day === todayKey() && min > nowMin),
      )
    : []

  const clearHold = () => {
    if (holdTimer.current != null) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  function pressStart(e: React.PointerEvent<HTMLButtonElement>, booking: Booking) {
    if (!onMove || !MOVABLE.has(booking.status) || dragRef.current) return
    const target = e.currentTarget
    const pointerId = e.pointerId
    updateDrag({ id: booking.id, startY: e.clientY, deltaMin: 0, active: false })
    holdTimer.current = window.setTimeout(() => {
      const d = dragRef.current
      if (!d || d.id !== booking.id) return
      try {
        target.setPointerCapture(pointerId)
      } catch {
        // The pointer already ended; the drag still works from the block's own events.
      }
      navigator.vibrate?.(10)
      updateDrag({ ...d, active: true })
    }, HOLD_MS)
  }

  function pressMove(e: React.PointerEvent<HTMLButtonElement>, startMin: number, endMin: number) {
    const d = dragRef.current
    if (!d) return
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.abs(dy) > HOLD_SLOP_PX) {
        clearHold()
        updateDrag(null)
      }
      return
    }
    const raw = Math.round(((dy / HOUR_PX) * 60) / SNAP_MIN) * SNAP_MIN
    const min = startHour * 60 - startMin
    const max = endHour * 60 - endMin
    const deltaMin = Math.min(max, Math.max(min, raw))
    if (deltaMin !== d.deltaMin) updateDrag({ ...d, deltaMin })
  }

  async function pressEnd(booking: Booking, startMin: number) {
    clearHold()
    const d = dragRef.current
    if (!d || !d.active) {
      updateDrag(null)
      return
    }
    // A held press never opens the job, whether or not it moved.
    suppressClick.current = true
    if (d.deltaMin === 0 || !onMove) {
      updateDrag(null)
      return
    }
    try {
      await onMove(booking, clock(startMin + d.deltaMin))
    } finally {
      updateDrag(null)
    }
  }

  function pressCancel() {
    clearHold()
    if (!dragRef.current?.active) updateDrag(null)
  }

  return (
    <div
      ref={gridRef}
      className="relative rounded-2xl border border-black/5 bg-white py-2 pr-2"
      style={{ height: hours.length * HOUR_PX + 16 }}
    >
      {[...hours, endHour].map((h) => (
        <div key={h} className="absolute left-0 right-0 flex" style={{ top: 8 + (h - startHour) * HOUR_PX }}>
          <span className="w-14 shrink-0 -translate-y-1/2 pr-2 text-right text-[0.8125rem] font-semibold text-[#14100F]/60">
            {hourLabel(h)}
          </span>
          <span className="h-px flex-1 bg-black/[0.07]" />
        </div>
      ))}

      <div className="absolute bottom-2 left-14 right-2 top-2">
        {slotStarts.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => onSlot?.(clock(min))}
            aria-label={`Book ${formatTime(clock(min))}`}
            className="absolute left-0 right-0 flex items-center rounded-lg px-2 text-sm font-bold text-[#14100F]/0 transition-colors active:bg-[#C96C83]/10 active:text-[#9E4A60]"
            style={{ top: top(min), height: (SLOT_MIN / 60) * HOUR_PX }}
          >
            + {formatTime(clock(min))}
          </button>
        ))}
        {placed.map(({ booking, startMin, endMin, column, columns }) => {
          const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 30)
          const compact = height < 52
          const dragging = drag?.id === booking.id && drag.active
          const shift = dragging ? drag.deltaMin : 0
          return (
            <button
              key={booking.id}
              type="button"
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false
                  return
                }
                onOpen(booking)
              }}
              onPointerDown={(e) => pressStart(e, booking)}
              onPointerMove={(e) => pressMove(e, startMin, endMin)}
              onPointerUp={() => void pressEnd(booking, startMin)}
              onPointerCancel={pressCancel}
              onContextMenu={(e) => {
                if (onMove && MOVABLE.has(booking.status)) e.preventDefault()
              }}
              className={cn(
                "absolute select-none overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left transition-transform [-webkit-touch-callout:none] active:scale-[0.98]",
                BLOCK[booking.status],
                dragging && "z-10 scale-[1.02] shadow-lg ring-2 ring-[#14100F]",
              )}
              style={{
                top: top(startMin + shift),
                height: height - 2,
                left: `calc(${(column / columns) * 100}% + 2px)`,
                width: `calc(${100 / columns}% - 4px)`,
              }}
            >
              <span className="block truncate text-sm font-extrabold text-[#14100F]">
                {booking.service?.name}
                {compact && dragging ? (
                  <span className="font-semibold text-[#14100F]/60"> · to {formatTime(clock(startMin + shift))}</span>
                ) : compact && who(booking) ? (
                  <span className="font-semibold text-[#14100F]/60"> · {who(booking)}</span>
                ) : null}
              </span>
              {!compact ? (
                <>
                  <span className="block truncate text-[0.8125rem] font-semibold text-[#14100F]/60">
                    {dragging
                      ? `Move to ${formatTime(clock(startMin + shift))}`
                      : `${formatBookingTime(booking.starts_at)} – ${formatBookingTime(booking.ends_at)}`}
                  </span>
                  {who(booking) ? <span className="block truncate text-[0.8125rem] text-[#14100F]/60">{who(booking)}</span> : null}
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

function clock(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}
