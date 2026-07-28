"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useAdminShifts, useDeleteShift, type Shift, type AdminShiftFilters } from "@/lib/hooks/use-time-clock"
import { useAdminEmployees } from "@/lib/hooks/use-admin"

const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

const name = (u?: { first_name: string | null; last_name: string | null; email: string }) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : "—"

function duration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AdminShiftsPage() {
  const [filters, setFilters] = useState<AdminShiftFilters>({ page: 1 })
  const { data, isLoading } = useAdminShifts(filters)
  const { data: employees } = useAdminEmployees(1)
  const del = useDeleteShift()
  const shifts = data?.data ?? []
  const totals = data?.totals

  const set = (patch: Partial<AdminShiftFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }))

  return (
    <div className="space-y-6">
      <DashboardHeader title="Fuel Compensation" subtitle="Staff shifts, travel distance and reimbursement owed" />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-black/8 bg-white px-5 py-4">
        <Field label="Employee">
          <select
            className="h-9 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]"
            value={filters.employee_profile_id ?? ""}
            onChange={(e) => set({ employee_profile_id: e.target.value || undefined })}
          >
            <option value="">All employees</option>
            {employees?.data.map((emp) => (
              <option key={emp.id} value={emp.id}>{name(emp.user)}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className="h-9 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]"
            value={filters.status ?? ""}
            onChange={(e) => set({ status: e.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="open">On shift</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" className="h-9 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]"
            value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
        </Field>
        <Field label="To">
          <input type="date" className="h-9 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]"
            value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} />
        </Field>
        {(filters.employee_profile_id || filters.status || filters.from || filters.to) && (
          <Button variant="outline" size="sm" onClick={() => setFilters({ page: 1 })}>Clear</Button>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Shifts" value={totals?.shifts ?? 0} />
        <StatCard label="Total Distance" value={`${(totals?.distance_km ?? 0).toFixed(1)} km`} />
        <StatCard label="Total Owed" value={`$${(totals?.fuel_reimbursement ?? 0).toFixed(2)}`} accent />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#8a8d93] border-b border-black/8">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Clock in</th>
                <th className="px-5 py-3 font-medium">Clock out</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium text-right">Distance</th>
                <th className="px-5 py-3 font-medium text-right">Reimbursement</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[#5f6268]">Loading…</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[#5f6268]">No shifts match these filters.</td></tr>
              ) : (
                shifts.map((s: Shift) => (
                  <tr key={s.id} className="border-b border-black/5 last:border-0">
                    <td className="px-5 py-3 font-medium text-[#101217]">{name(s.employee_profile?.user)}</td>
                    <td className="px-5 py-3 text-[#5f6268]">{dt(s.clock_in_at)}</td>
                    <td className="px-5 py-3 text-[#5f6268]">
                      {s.status === "open"
                        ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>On shift</span>
                        : dt(s.clock_out_at)}
                    </td>
                    <td className="px-5 py-3 text-[#5f6268]">{duration(s.duration_seconds)}</td>
                    <td className="px-5 py-3 text-right font-medium text-[#101217]">{Number(s.distance_km).toFixed(1)} km</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#c96c83]">${Number(s.fuel_reimbursement).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        title="Delete shift"
                        disabled={del.isPending}
                        onClick={() => { if (confirm("Delete this shift record?")) del.mutate(s.id) }}
                        className="text-[#d4754a] hover:opacity-70"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{filters.page ?? 1} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Next</Button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[#8a8d93]">{label}</span>
      {children}
    </div>
  )
}
