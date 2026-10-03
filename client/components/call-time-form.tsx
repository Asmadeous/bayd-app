"use client"

import { useMemo, useState } from "react"

import { bookingDateKey, bookingLocalMinutes, nowLocalMinutes, todayKey, bookingZoneLabel } from "@/lib/booking-time"
import type { CallTime } from "@/lib/hooks/use-meetings"

const EARLIEST = 8 * 60 // 8:00 AM
const LATEST = 21 * 60 // 9:00 PM
const STEP = 15

function toClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function toLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

// Pick when the work-scope call happens: any 15-minute slot from now until the
// appointment starts, in the business's timezone (like every booking time), or
// start it right away. Shared by the web dashboards and both apps, which each
// wrap it in their own dialog or panel.
export function CallTimeForm({
  startsAt,
  pending,
  error,
  submitLabel = "Set call time",
  onSubmit,
  className = "",
}: {
  startsAt: string
  pending: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (at: CallTime) => void
  className?: string
}) {
  const today = todayKey()
  const lastDay = bookingDateKey(startsAt)
  const [date, setDate] = useState(today <= lastDay ? today : lastDay)
  const [time, setTime] = useState("")

  const slots = useMemo(() => {
    const from = date === today ? Math.ceil((nowLocalMinutes() + 1) / STEP) * STEP : EARLIEST
    const to = date === lastDay ? Math.min(LATEST, bookingLocalMinutes(startsAt)) : LATEST
    const out: number[] = []
    for (let m = Math.max(from, EARLIEST); m <= to; m += STEP) out.push(m)
    return out
  }, [date, today, lastDay, startsAt])

  const field = "h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none focus:border-[#c96c83]"

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Day</span>
          <input
            type="date"
            className={field}
            min={today}
            max={lastDay}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setTime("")
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Time ({bookingZoneLabel()})</span>
          <select className={field} value={time} onChange={(e) => setTime(e.target.value)} disabled={slots.length === 0}>
            <option value="">{slots.length ? "Choose" : "No times left"}</option>
            {slots.map((m) => (
              <option key={m} value={toClock(m)}>
                {toLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-sm font-semibold text-[#8f3f4b]">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit("now")}
          className="h-11 rounded-xl border border-black/15 bg-white text-sm font-bold text-[#101217] disabled:opacity-50"
        >
          Start now
        </button>
        <button
          type="button"
          disabled={pending || !date || !time}
          onClick={() => onSubmit(`${date}T${time}`)}
          className="h-11 rounded-xl bg-[#101217] text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
      <p className="text-xs text-[#8a8d93]">Both of you get a notification now and a reminder before the call. The room opens 10 minutes before.</p>
    </div>
  )
}
