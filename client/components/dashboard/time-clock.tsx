"use client"

import { useEffect, useState } from "react"
import { MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrentShift, useClockIn, useClockOut } from "@/lib/hooks/use-time-clock"

function elapsed(fromISO: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(fromISO).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
}

export function TimeClock() {
  const { data: shift, isLoading } = useCurrentShift()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const [, setTick] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Re-render once a second so the elapsed timer ticks while on shift.
  useEffect(() => {
    if (!shift) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [shift])

  const busy = clockIn.isPending || clockOut.isPending
  const active = !!shift

  function handle(action: "in" | "out") {
    setError(null)
    const mut = action === "in" ? clockIn : clockOut
    mut.mutate(undefined, { onError: (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong") })
  }

  return (
    <div
      className="rounded-xl border bg-white px-5 py-4"
      style={{ borderColor: active ? "#5a9e5a55" : "rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="grid place-items-center size-10 rounded-full shrink-0"
            style={{ background: active ? "#5a9e5a22" : "#c96c8322", color: active ? "#5a9e5a" : "#c96c83" }}
          >
            <Clock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#101217]">
              {isLoading ? "Time Clock" : active ? "On shift" : "Off shift"}
            </p>
            <p className="text-xs text-[#5f6268]">
              {active && shift
                ? `Clocked in ${new Date(shift.clock_in_at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })} · ${elapsed(shift.clock_in_at)}`
                : "Clock in to start tracking your shift and travel"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          disabled={busy || isLoading}
          onClick={() => handle(active ? "out" : "in")}
          style={
            active
              ? { background: "#101217", border: "none", color: "#fff" }
              : { background: "#5a9e5a", border: "none", color: "#fff" }
          }
        >
          <MapPin className="size-4 mr-1.5" />
          {busy ? "Locating…" : active ? "Clock out" : "Clock in"}
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-[#d4754a]">{error}</p>}

      <p className="mt-3 text-[11px] text-[#8a8d93] flex items-center gap-1">
        <MapPin className="size-3" /> Your location is recorded at clock-in and clock-out to calculate travel for fuel reimbursement.
      </p>
    </div>
  )
}
