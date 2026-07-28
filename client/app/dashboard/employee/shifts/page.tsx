"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import { useShifts, type Shift } from "@/lib/hooks/use-time-clock"

const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

function duration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function EmployeeShiftsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useShifts(page)
  const shifts = data?.data ?? []
  const totals = data?.totals

  return (
    <div className="space-y-6">
      <DashboardHeader title="My Shifts" subtitle="Your clock-in history and travel reimbursement" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Shifts" value={data?.pagination.total_count ?? 0} />
        <StatCard label="Distance Travelled" value={`${(totals?.distance_km ?? 0).toFixed(1)} km`} />
        <StatCard label="Fuel Reimbursement" value={`$${(totals?.fuel_reimbursement ?? 0).toFixed(2)}`} accent />
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : shifts.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No shifts yet. Clock in from your dashboard to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((s) => <ShiftRow key={s.id} shift={s} />)}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

function ShiftRow({ shift: s }: { shift: Shift }) {
  const open = s.status === "open"
  const color = open ? "#5a9e5a" : "#8a8d93"
  return (
    <div className="rounded-xl border border-black/8 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#101217]">{dt(s.clock_in_at)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${color}22`, color }}>
              {open ? "On shift" : "Closed"}
            </span>
          </div>
          <p className="text-xs text-[#5f6268] mt-0.5">
            {open ? "In progress" : `${dt(s.clock_in_at)} → ${dt(s.clock_out_at)}`} · {duration(s.duration_seconds)}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#8a8d93]">Distance</p>
            <p className="text-sm font-semibold text-[#101217]">{Number(s.distance_km).toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#8a8d93]">Fuel</p>
            <p className="text-sm font-semibold text-[#c96c83]">${Number(s.fuel_reimbursement).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
