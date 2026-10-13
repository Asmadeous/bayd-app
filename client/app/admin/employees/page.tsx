"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRight, Plus } from "lucide-react"

import { StaffFormDialog } from "@/components/dashboard/staff-editor"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useAdminAnalytics, useAdminEmployees, type AnalyticsEmployee, type AnalyticsPeriod } from "@/lib/hooks/use-admin"
import { useAdminPartners } from "@/lib/hooks/use-partners"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"
import { Avatar, KPI_PERIOD_LABEL, KPI_PERIODS } from "./staff-shared"

// The web Employees page: every staff member with their status and KPIs for a
// period, and Add Staff. Each opens their staff screen.
export default function AdminEmployeesScreen() {
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [adding, setAdding] = useState(false)
  const { data, isLoading } = useAdminEmployees(page)
  const { data: analytics } = useAdminAnalytics(period)
  const { data: partnersData } = useAdminPartners()
  const employees = data?.data ?? []
  const kpiById = new Map<number, AnalyticsEmployee>((analytics?.employees ?? []).map((e) => [e.id, e]))

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Employees"
        action={
          <button type="button" onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Add
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Profiles, shifts, dispatch coverage, partners, and performance KPIs.</p>
      {adding ? <StaffFormDialog mode="create" partners={partnersData?.data ?? []} onClose={() => setAdding(false)} /> : null}

      <div className="space-y-3 px-5">
        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${mutedClass}`}>KPIs for</p>
        <FilterChips options={KPI_PERIODS} value={period} onChange={setPeriod} label={(p) => KPI_PERIOD_LABEL[p]} />
        <p className={`text-sm font-semibold ${mutedClass}`}>{employees.length} visible employees</p>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading employees…</p>
        ) : employees.length === 0 ? (
          <EmptyCard title="No employees found" body="Employee profiles and performance details will appear here." />
        ) : (
          employees.map((emp) => {
            const name = [emp.user?.first_name, emp.user?.last_name].filter(Boolean).join(" ")
            const kpi = kpiById.get(emp.id)
            return (
              <Link key={emp.id} href={`/admin/employees/view?id=${emp.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
                <Avatar photo={emp.photo_url} name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{name}</p>
                  {emp.title ? <p className="truncate text-xs font-bold text-[#a36f4d]">{emp.title}</p> : null}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {!emp.dispatchable ? <StatusBadge tone="red">Auto-assign paused</StatusBadge> : null}
                    <StatusBadge tone={emp.on_shift ? "green" : "gray"}>{emp.on_shift ? "On Shift" : "Off Shift"}</StatusBadge>
                  </div>
                  <p className={`mt-1.5 text-xs ${mutedClass}`}>
                    {kpi?.bookings_completed ?? 0} completed · {formatMoney(kpi?.revenue ?? 0, { maximumFractionDigits: 0 })} ·{" "}
                    {kpi?.average_rating != null ? `★ ${kpi.average_rating.toFixed(1)}` : "no rating"}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
              </Link>
            )
          })
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
