"use client"

import { useState } from "react"
import { Fuel, Route } from "lucide-react"

import { useShifts, type Shift } from "@/lib/hooks/use-time-clock"
import { useEmployeeProfile } from "@/lib/hooks/use-employee"
import { staffScreenClass, cardClass, eyebrowClass, mutedClass, staffTheme } from "../staff-theme"
import { StaffHeader } from "../staff-header"

export default function StaffShiftsScreen() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useShifts(page)
  const { data: profile } = useEmployeeProfile()
  // Partner providers aren't reimbursed for fuel — it flows through the partner,
  // so their shift view hides fuel entirely. Attendance/hours still apply.
  const isPartner = !!profile?.partner_id
  const shifts = data?.data ?? []
  const totals = data?.totals
  const pagination = data?.pagination

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        title="Shifts"
        subtitle={isPartner ? "Clock-in history and hours." : "Clock-in history and travel reimbursement."}
      />

      <div className="space-y-4 px-5">
        {/* Totals */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Shifts" value={pagination?.total_count ?? 0} />
          <Stat label="Hours" value={formatHours(totals?.hours_worked)} />
          <Stat label="On-time" value={formatRate(totals?.on_time_rate)} accent />
        </div>
        <div className={`grid gap-3 ${isPartner ? "grid-cols-1" : "grid-cols-2"}`}>
          <Stat label="Distance" value={formatDistance(totals?.distance_km)} />
          {!isPartner && <Stat label="Fuel" value={formatCurrency(totals?.fuel_reimbursement)} accent />}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <Fuel className="size-7 text-[#C96C83]" aria-hidden />
            <p className="font-bold">No shifts yet</p>
            <p className={`text-sm ${mutedClass}`}>Clock in from Schedule to start tracking.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {shifts.map((s) => (
              <ShiftRow key={s.id} shift={s} showFuel={!isPartner} />
            ))}
          </ul>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              Prev
            </button>
            <span className={`text-sm font-semibold ${mutedClass}`}>
              {page} / {pagination.total_pages}
            </span>
            <button
              type="button"
              disabled={!pagination.next_page}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShiftRow({ shift, showFuel }: { shift: Shift; showFuel: boolean }) {
  const open = shift.status === "open"
  return (
    <li className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">{dt(shift.clock_in_at)}</p>
        <span
          className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em]"
          style={
            open
              ? { background: `${staffTheme.live}1f`, color: "#3f7e47" }
              : { background: "rgba(0,0,0,0.06)", color: "rgba(20,16,15,0.55)" }
          }
        >
          {open ? "On shift" : "Closed"}
        </span>
      </div>
      <p className={`mt-1 text-sm ${mutedClass}`}>
        {open ? "In progress" : `${dt(shift.clock_in_at)} → ${dt(shift.clock_out_at)}`} ·{" "}
        {duration(shift.duration_seconds)}
      </p>

      <div className="mt-3 flex gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-xs font-semibold">
          <Route className="size-3.5 text-[#C96C83]" aria-hidden />
          {formatDistance(shift.distance_km)}
        </span>
        {showFuel && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#C96C83]/10 px-2.5 py-1.5 text-xs font-semibold text-[#C96C83]">
            <Fuel className="size-3.5" aria-hidden />
            {formatCurrency(shift.fuel_reimbursement)}
          </span>
        )}
        {!open && (
          <span
            className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={
              shift.arrived_late
                ? { background: "rgba(143,63,75,0.1)", color: "#8f3f4b" }
                : { background: `${staffTheme.live}1f`, color: "#3f7e47" }
            }
          >
            {shift.arrived_late ? "Late" : "On time"}
          </span>
        )}
      </div>
    </li>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`${cardClass} p-3`}>
      <p className={`text-lg font-black leading-none ${accent ? "text-[#C96C83]" : ""}`}>{value}</p>
      <p className={`mt-1 ${eyebrowClass}`}>{label}</p>
    </div>
  )
}

function dt(s: string | null) {
  if (!s) return "-"
  const date = new Date(s)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function duration(secs: unknown) {
  const value = Number(secs)
  if (!Number.isFinite(value) || value < 0) return "-"
  const s = Math.floor(value)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDistance(value: unknown) {
  const d = Number(value ?? 0)
  return Number.isFinite(d) ? `${d.toFixed(1)} km` : "-"
}

function formatCurrency(value: unknown) {
  const a = Number(value ?? 0)
  return Number.isFinite(a) ? `$${a.toFixed(2)}` : "-"
}

function formatHours(value: unknown) {
  const h = Number(value ?? 0)
  return Number.isFinite(h) ? `${h.toFixed(1)}h` : "-"
}

function formatRate(value: unknown) {
  if (value == null) return "-"
  const r = Number(value)
  return Number.isFinite(r) ? `${r}%` : "-"
}
