"use client"

import { useMemo, type DragEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import {
  addDays,
  bookingDateKey,
  formatBookingTime,
  formatDateKey,
  nowLocalMinutes,
  todayKey,
  type DateKey,
} from "@/lib/booking-time"
import { gridHours, layoutDay } from "@/lib/calendar-layout"
import type { Booking } from "@/lib/hooks/use-bookings"
import type { CalendarState, CalendarView } from "@/lib/hooks/use-calendar-state"
import { cn } from "@/lib/utils"

export interface CalendarSlot {
  date: DateKey
  time?: string // "HH:MM", company zone; absent for a whole-day (month) pick
}

interface BookingCalendarProps {
  state: CalendarState
  bookings: Booking[]
  isLoading?: boolean
  isError?: boolean
  onSelectBooking: (booking: Booking) => void
  // Omit to make the calendar read-only for creating.
  onSelectSlot?: (slot: CalendarSlot) => void
  // Which name an event shows: the client (staff/admin) or the tech (customer).
  who?: "client" | "tech" | "both"
  toolbar?: ReactNode
  // Bookable hours per day ("HH:MM" pairs). Given, time outside them is shaded
  // and days with none are marked off. Informational: it doesn't block clicks.
  availability?: Record<DateKey, { start: string; end: string }[]>
  // Given, bookings that canMove() are draggable onto another slot or day.
  onMoveBooking?: (booking: Booking, slot: CalendarSlot) => void
  canMove?: (booking: Booking) => boolean
}

interface DragProps {
  availability?: BookingCalendarProps["availability"]
  onMoveBooking?: BookingCalendarProps["onMoveBooking"]
  canMove?: BookingCalendarProps["canMove"]
}

const DRAG_TYPE = "application/x-bayd-booking"

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// Read the dragged booking from a drop event and hand it to onMoveBooking.
function dropHandlers(bookings: Map<number, Booking>, slot: CalendarSlot, onMove?: BookingCalendarProps["onMoveBooking"]) {
  if (!onMove) return {}
  return {
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault()
    },
    onDrop: (e: DragEvent) => {
      const booking = bookings.get(Number(e.dataTransfer.getData(DRAG_TYPE)))
      if (!booking) return
      e.preventDefault()
      onMove(booking, slot)
    },
  }
}

function dragSource(booking: Booking, canMove?: BookingCalendarProps["canMove"], onMove?: BookingCalendarProps["onMoveBooking"]) {
  if (!onMove || !canMove?.(booking)) return {}
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, String(booking.id))
      e.dataTransfer.effectAllowed = "move"
    },
  }
}

const HOUR_PX = 48
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
]

const STATUS_CLASS: Record<Booking["status"], string> = {
  pending: "border-l-[#d4a843] bg-[#d4a843]/12",
  confirmed: "border-l-[#c96c83] bg-[#c96c83]/12",
  in_progress: "border-l-[#d4a843] bg-[#d4a843]/20",
  completed: "border-l-[#5a9e5a] bg-[#5a9e5a]/12",
  cancelled: "border-l-[#8a8d93] bg-black/[0.04] text-[#8a8d93] line-through",
  no_show: "border-l-[#d4754a] bg-[#d4754a]/12",
  missed: "border-l-[#101217] bg-[#101217]/10",
}

const DOT_CLASS: Record<Booking["status"], string> = {
  pending: "bg-[#d4a843]",
  confirmed: "bg-[#c96c83]",
  in_progress: "bg-[#d4a843]",
  completed: "bg-[#5a9e5a]",
  cancelled: "bg-[#8a8d93]",
  no_show: "bg-[#d4754a]",
  missed: "bg-[#101217]",
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function hourLabel(hour: number) {
  const h = hour % 24
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`
}

// A slot is creatable only if it's still ahead of now in the company zone.
function isFuture(date: DateKey, minutes?: number) {
  const today = todayKey()
  if (date !== today) return date > today
  return minutes === undefined ? true : minutes > nowLocalMinutes()
}

function whoLabel(booking: Booking, who: BookingCalendarProps["who"]) {
  const client = booking.customer_name
  const tech = booking.employee_profile?.name
  if (who === "tech") return tech
  if (who === "both") return [client, tech].filter(Boolean).join(" · ")
  return client
}

// Month / Week / Day calendar of bookings. Presentational: the parent owns the
// range (useCalendarState), fetches bookings for it, and handles clicks. Below
// `sm` the week view shows the cursor's day, since 7 columns don't fit a phone.
export function BookingCalendar({
  state,
  bookings,
  isLoading,
  isError,
  onSelectBooking,
  onSelectSlot,
  who = "client",
  toolbar,
  availability,
  onMoveBooking,
  canMove,
}: BookingCalendarProps) {
  const drag: DragProps = { availability, onMoveBooking, canMove }
  const byId = useMemo(() => new Map(bookings.map((b) => [b.id, b])), [bookings])
  const byDay = useMemo(() => {
    const map = new Map<DateKey, Booking[]>()
    for (const b of bookings) {
      const key = bookingDateKey(b.starts_at)
      map.set(key, [...(map.get(key) ?? []), b])
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    return map
  }, [bookings])

  const title =
    state.view === "month"
      ? formatDateKey(`${state.cursor.slice(0, 7)}-01`, { month: "long", year: "numeric" })
      : state.view === "week"
        ? `${formatDateKey(state.from, { month: "short", day: "numeric" })} - ${formatDateKey(state.to, { month: "short", day: "numeric", year: "numeric" })}`
        : formatDateKey(state.cursor, { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(state.from, i))

  return (
    <div className="overflow-hidden border border-black/10 bg-white shadow-sm shadow-black/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 bg-[#fbfaf7] px-4 py-3">
        <div className="flex items-center gap-2">
          <NavButton label="Previous" onClick={state.prev}>
            <ChevronLeft aria-hidden className="size-4" />
          </NavButton>
          <button
            type="button"
            onClick={state.today}
            className="h-9 border border-black/10 bg-white px-3 text-xs font-bold text-[#101217] hover:border-[#c96c83]/35"
          >
            Today
          </button>
          <NavButton label="Next" onClick={state.next}>
            <ChevronRight aria-hidden className="size-4" />
          </NavButton>
          <h2 className="ml-1 font-heading text-base font-extrabold text-[#101217] sm:text-lg" aria-live="polite">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <div className="inline-flex border border-black/10 bg-white" role="tablist" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                type="button"
                role="tab"
                aria-selected={state.view === v.value}
                onClick={() => state.setView(v.value)}
                className={cn(
                  "h-9 px-3 text-xs font-bold",
                  state.view === v.value ? "bg-[#101217] text-white" : "text-[#5f6268] hover:bg-black/[0.04]",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("relative", isLoading && "opacity-60")} aria-busy={isLoading}>
        {isError ? (
          <p className="px-5 py-10 text-center text-sm text-red-700">Bookings couldn&apos;t be loaded. Try again shortly.</p>
        ) : state.view === "month" ? (
          <MonthGrid
            state={state}
            byDay={byDay}
            byId={byId}
            drag={drag}
            onSelectBooking={onSelectBooking}
            onSelectSlot={onSelectSlot}
          />
        ) : state.view === "week" ? (
          <>
            <div className="hidden sm:block">
              <TimeGrid days={weekDays} byDay={byDay} byId={byId} drag={drag} state={state} who={who} onSelectBooking={onSelectBooking} onSelectSlot={onSelectSlot} />
            </div>
            <div className="sm:hidden">
              <TimeGrid days={[state.cursor]} byDay={byDay} byId={byId} drag={drag} state={state} who={who} onSelectBooking={onSelectBooking} onSelectSlot={onSelectSlot} />
            </div>
          </>
        ) : (
          <TimeGrid days={[state.cursor]} byDay={byDay} byId={byId} drag={drag} state={state} who={who} onSelectBooking={onSelectBooking} onSelectSlot={onSelectSlot} />
        )}
        {!isLoading && !isError && bookings.length === 0 ? (
          <p className="border-t border-black/6 px-5 py-3 text-center text-xs text-[#5f6268]">
            No appointments in this {state.view}.
            {onSelectSlot ? " Pick a future day or time to add one." : ""}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center border border-black/10 bg-white text-[#5f6268] hover:border-[#c96c83]/35 hover:text-[#101217]"
    >
      {children}
    </button>
  )
}

function MonthGrid({
  state,
  byDay,
  byId,
  drag,
  onSelectBooking,
  onSelectSlot,
}: {
  state: CalendarState
  byDay: Map<DateKey, Booking[]>
  byId: Map<number, Booking>
  drag: DragProps
  onSelectBooking: (b: Booking) => void
  onSelectSlot?: (slot: CalendarSlot) => void
}) {
  const month = state.cursor.slice(0, 7)
  const today = todayKey()
  const days = Array.from({ length: 42 }, (_, i) => addDays(state.from, i))

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-black/6">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#6b6f76]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const list = byDay.get(day) ?? []
          const inMonth = day.startsWith(month)
          const canCreate = onSelectSlot && isFuture(day)
          const off = drag.availability ? (drag.availability[day] ?? []).length === 0 : false
          return (
            <div
              key={day}
              {...dropHandlers(byId, { date: day }, isFuture(day) ? drag.onMoveBooking : undefined)}
              className={cn(
                "group relative min-h-16 border-b border-r border-black/6 p-1 sm:min-h-24",
                !inMonth && "bg-[#fbfaf7]",
                off && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(16,18,23,0.04)_6px,rgba(16,18,23,0.04)_12px)]",
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => state.openDay(day)}
                  aria-label={`Open ${formatDateKey(day, { weekday: "long", month: "long", day: "numeric" })}`}
                  className={cn(
                    "flex size-6 items-center justify-center text-xs font-semibold",
                    day === today ? "bg-[#c96c83] text-white" : inMonth ? "text-[#101217]" : "text-[#8a8d93]",
                  )}
                >
                  {Number(day.slice(8))}
                </button>
                {off ? <span className="hidden text-[0.6rem] font-bold uppercase text-[#8a8d93] sm:inline">Off</span> : null}
                {canCreate ? (
                  <button
                    type="button"
                    onClick={() => onSelectSlot({ date: day })}
                    aria-label={`Add appointment on ${formatDateKey(day, { month: "long", day: "numeric" })}`}
                    className="flex size-6 items-center justify-center text-[#8a8d93] opacity-60 hover:bg-[#c96c83]/10 hover:text-[#c96c83] group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              {/* Phones get dots; wider screens get chips. */}
              <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBooking(b)}
                    aria-label={`${b.service?.name} at ${formatBookingTime(b.starts_at)}`}
                    className={cn("size-2 rounded-full", DOT_CLASS[b.status])}
                  />
                ))}
              </div>
              <div className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBooking(b)}
                    {...dragSource(b, drag.canMove, drag.onMoveBooking)}
                    className={cn(
                      "block w-full truncate border-l-2 px-1 py-0.5 text-left text-[0.68rem] font-semibold text-[#101217]",
                      STATUS_CLASS[b.status],
                    )}
                  >
                    {formatBookingTime(b.starts_at)} {b.service?.name}
                  </button>
                ))}
                {list.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => state.openDay(day)}
                    className="block text-[0.68rem] font-bold text-[#c96c83] hover:underline"
                  >
                    +{list.length - 3} more
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimeGrid({
  days,
  byDay,
  byId,
  drag,
  state,
  who,
  onSelectBooking,
  onSelectSlot,
}: {
  days: DateKey[]
  byDay: Map<DateKey, Booking[]>
  byId: Map<number, Booking>
  drag: DragProps
  state: CalendarState
  who: BookingCalendarProps["who"]
  onSelectBooking: (b: Booking) => void
  onSelectSlot?: (slot: CalendarSlot) => void
}) {
  const placedByDay = days.map((day) => layoutDay(byDay.get(day) ?? []))
  const { startHour, endHour } = gridHours(placedByDay.flat())
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = hours.length * HOUR_PX
  const today = todayKey()

  return (
    <div>
      {days.length > 1 ? (
        <div className="grid border-b border-black/6" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => state.openDay(day)}
              className={cn("py-2 text-center text-xs font-bold", day === today ? "text-[#c96c83]" : "text-[#101217]")}
            >
              {formatDateKey(day, { weekday: "short" })} {Number(day.slice(8))}
            </button>
          ))}
        </div>
      ) : null}
      <div className="max-h-[70vh] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative" style={{ height }}>
            {hours.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[0.65rem] font-semibold text-[#8a8d93]"
                style={{ top: i * HOUR_PX }}
              >
                {i === 0 ? "" : hourLabel(h)}
              </span>
            ))}
          </div>
          {days.map((day, di) => (
            <div key={day} className="relative border-l border-black/6" style={{ height }}>
              {hours.flatMap((h) =>
                [0, 30].map((m) => {
                  const minutes = h * 60 + m
                  const creatable = onSelectSlot && isFuture(day, minutes)
                  return (
                    <button
                      key={`${h}:${m}`}
                      type="button"
                      {...dropHandlers(byId, { date: day, time: `${pad(h)}:${pad(m)}` }, isFuture(day, minutes) ? drag.onMoveBooking : undefined)}
                      disabled={!creatable && !drag.onMoveBooking}
                      onClick={() => creatable && onSelectSlot?.({ date: day, time: `${pad(h)}:${pad(m)}` })}
                      aria-label={creatable ? `Add appointment ${formatDateKey(day, { month: "short", day: "numeric" })} at ${hourLabel(h).replace(" ", `:${pad(m)} `)}` : undefined}
                      tabIndex={creatable ? 0 : -1}
                      className={cn(
                        "absolute inset-x-0 block",
                        m === 0 ? "border-t border-black/6" : "border-t border-dashed border-black/[0.04]",
                        creatable ? "hover:bg-[#c96c83]/6" : "cursor-default",
                      )}
                      style={{ top: (minutes - startHour * 60) * (HOUR_PX / 60), height: HOUR_PX / 2 }}
                    />
                  )
                }),
              )}
              {drag.availability ? (
                <UnavailableShading
                  windows={drag.availability[day] ?? []}
                  startHour={startHour}
                  endHour={endHour}
                />
              ) : null}
              {placedByDay[di].map((p) => {
                const top = (p.startMin - startHour * 60) * (HOUR_PX / 60)
                const h = Math.max(20, (p.endMin - p.startMin) * (HOUR_PX / 60) - 2)
                return (
                  <button
                    key={p.booking.id}
                    type="button"
                    onClick={() => onSelectBooking(p.booking)}
                    {...dragSource(p.booking, drag.canMove, drag.onMoveBooking)}
                    className={cn(
                      "absolute overflow-hidden border-l-[3px] px-1.5 py-1 text-left text-[0.7rem] leading-tight text-[#101217] shadow-sm hover:z-10 hover:shadow-md",
                      STATUS_CLASS[p.booking.status],
                    )}
                    style={{
                      top,
                      height: h,
                      left: `calc(${(p.column / p.columns) * 100}% + 2px)`,
                      width: `calc(${100 / p.columns}% - 4px)`,
                    }}
                  >
                    <span className="block font-bold">{formatBookingTime(p.booking.starts_at)}</span>
                    <span className="block truncate font-semibold">{p.booking.service?.name}</span>
                    <span className="block truncate text-[#5f6268]">{whoLabel(p.booking, who)}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Greys out the parts of a day column outside the tech's bookable windows.
// Sits under the slot buttons' hover and never catches clicks.
function UnavailableShading({
  windows,
  startHour,
  endHour,
}: {
  windows: { start: string; end: string }[]
  startHour: number
  endHour: number
}) {
  const gridStart = startHour * 60
  const gridEnd = endHour * 60
  const open = windows
    .map((w) => [Math.max(gridStart, toMinutes(w.start)), Math.min(gridEnd, toMinutes(w.end))] as const)
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
  const closed: [number, number][] = []
  let cursor = gridStart
  for (const [a, b] of open) {
    if (a > cursor) closed.push([cursor, a])
    cursor = Math.max(cursor, b)
  }
  if (cursor < gridEnd) closed.push([cursor, gridEnd])

  return (
    <>
      {closed.map(([a, b]) => (
        <div
          key={a}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,rgba(16,18,23,0.035),rgba(16,18,23,0.035)_6px,transparent_6px,transparent_12px)]"
          style={{ top: (a - gridStart) * (HOUR_PX / 60), height: (b - a) * (HOUR_PX / 60) }}
        />
      ))}
    </>
  )
}
