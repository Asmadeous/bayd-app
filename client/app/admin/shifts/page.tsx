"use client"

import { useState } from "react"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDateTime } from "@/lib/booking-time"
import { useAdminEmployees } from "@/lib/hooks/use-admin"
import { useAdminShifts, useDeleteShift, type AdminShiftFilters, type Shift } from "@/lib/hooks/use-time-clock"
import { formatMoney } from "@/lib/stores/franchise-store"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, fieldClass, Pager } from "../ui"

const personName = (u?: { first_name: string | null; last_name: string | null; email: string }) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : "-"

function duration(secs: number) {
  if (!Number.isFinite(Number(secs)) || Number(secs) < 0) return "-"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// The web Fuel Compensation page: shifts filtered by employee, status and
// dates, the totals, and delete.
export default function AdminShiftsScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [filters, setFilters] = useState<AdminShiftFilters>({ page: 1 })
  const [dateError, setDateError] = useState<string | null>(null)
  const { data, isLoading } = useAdminShifts(filters)
  const { data: employees } = useAdminEmployees(1)
  const del = useDeleteShift()
  const shifts = data?.data ?? []
  const totals = data?.totals
  const filtered = !!(filters.employee_profile_id || filters.status || filters.from || filters.to)

  function set(patch: Partial<AdminShiftFilters>) {
    const next = { ...filters, ...patch, page: 1 }
    const error = next.from && next.to && next.to < next.from ? "To date must be on or after the From date." : null
    setDateError(error)
    if (!error) setFilters(next)
  }

  async function remove(shift: Shift) {
    const ok = await confirm({
      title: "Delete shift record?",
      message:
        shift.status === "open"
          ? "This shift is still open. Deleting it removes the active clock-in record and any tracked fuel compensation."
          : "This permanently removes the shift and its fuel compensation totals from this report.",
      confirmLabel: "Delete shift",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(shift.id, {
      onSuccess: () => toast({ title: "Shift deleted", variant: "success" }),
      onError: (e) => toast({ title: "Shift not deleted", description: apiError(e, "Could not delete this shift record."), variant: "error" }),
    })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Fuel & shifts" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Staff shifts, travel distance, and reimbursement owed.</p>
      <div className="space-y-3 px-5">
        <section className={`${cardClass} grid grid-cols-2 gap-3 p-4`}>
          <label className="col-span-2 block">
            <span className={eyebrowClass}>Employee</span>
            <select
              className={`${fieldClass} mt-1`}
              value={filters.employee_profile_id != null ? String(filters.employee_profile_id) : ""}
              onChange={(e) => set({ employee_profile_id: e.target.value || undefined })}
            >
              <option value="">All employees</option>
              {employees?.data.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {personName(emp.user)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 block">
            <span className={eyebrowClass}>Status</span>
            <select className={`${fieldClass} mt-1`} value={filters.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
              <option value="">All</option>
              <option value="open">On shift</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="block">
            <span className={eyebrowClass}>From</span>
            <input type="date" className={`${fieldClass} mt-1`} value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
          </label>
          <label className="block">
            <span className={eyebrowClass}>To</span>
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              min={filters.from}
              value={filters.to ?? ""}
              onChange={(e) => set({ to: e.target.value || undefined })}
            />
          </label>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setDateError(null)
                setFilters({ page: 1 })
              }}
              className="col-span-2 h-10 rounded-xl border border-black/10 bg-white text-sm font-bold"
            >
              Clear filters
            </button>
          ) : null}
        </section>
        {dateError ? <p className="rounded-xl bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]">{dateError}</p> : null}

        <div className="grid grid-cols-3 gap-2">
          <Total label="Shifts" value={String(totals?.shifts ?? 0)} />
          <Total label="Distance" value={`${(totals?.distance_km ?? 0).toFixed(1)} km`} />
          <Total label="Owed" value={formatMoney(totals?.fuel_reimbursement ?? 0)} accent />
        </div>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading shifts…</p>
        ) : shifts.length === 0 ? (
          <EmptyCard title="No shifts found" body="Adjust the filters to find another shift record." />
        ) : (
          shifts.map((shift) => (
            <section key={shift.id} className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold">{personName(shift.employee_profile?.user)}</span>
                {shift.status === "open" ? <StatusBadge tone="green">On Shift</StatusBadge> : null}
              </div>
              <p className={`mt-1 text-sm ${mutedClass}`}>
                {formatBookingDateTime(shift.clock_in_at)}
                {shift.clock_out_at ? ` to ${formatBookingDateTime(shift.clock_out_at)}` : ""} · {duration(shift.duration_seconds)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm">{Number.isFinite(Number(shift.distance_km)) ? `${Number(shift.distance_km).toFixed(1)} km` : "-"}</span>
                <span className="text-base font-bold text-[#C96C83]">{formatMoney(Number(shift.fuel_reimbursement))}</span>
              </div>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => remove(shift)}
                className="mt-3 h-9 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
              >
                Delete
              </button>
            </section>
          ))
        )}
        <Pager
          page={filters.page ?? 1}
          totalPages={data?.pagination?.total_pages}
          hasNext={!!data?.pagination?.next_page}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
        />
      </div>
    </div>
  )
}

function Total({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(cardClass, "p-3", accent && "bg-[#14100F] text-white")}>
      <p className={`text-[0.65rem] font-bold uppercase tracking-wide ${accent ? "text-white/70" : mutedClass}`}>{label}</p>
      <p className="mt-0.5 truncate text-base font-black">{value}</p>
    </div>
  )
}
