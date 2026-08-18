"use client"

import { useState } from "react"
import { Fuel } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useShifts, type Shift } from "@/lib/hooks/use-time-clock"
import { employeeShiftsSteps } from "@/lib/tours/employee-tour"

const dt = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-CA", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })
    : "-"

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
    <DashboardPage maxWidth="wide">
      <div data-tour="shifts-header">
        <DashboardHeader
          title="My Shifts"
          subtitle="Your clock-in history and travel reimbursement."
        />
      </div>

      <div data-tour="shifts-stats" className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Shifts" value={data?.pagination.total_count ?? 0} />
        <StatCard label="Distance Travelled" value={`${(totals?.distance_km ?? 0).toFixed(1)} km`} />
        <StatCard label="Fuel Reimbursement" value={`$${(totals?.fuel_reimbursement ?? 0).toFixed(2)}`} accent />
      </div>

      <div data-tour="shifts-list">
        {isLoading ? (
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">Loading shifts...</p>
          </DashboardPanel>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Fuel}
            title="No shifts yet"
            description="Clock in from your dashboard to start tracking shift history."
          />
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <ShiftRow key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </div>

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton
        steps={employeeShiftsSteps}
        pageKey="employee-shifts"
      />
    </DashboardPage>
  )
}

function ShiftRow({ shift }: { shift: Shift }) {
  const open = shift.status === "open"

  return (
    <DashboardPanel className="p-0">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-[#101217]">{dt(shift.clock_in_at)}</h2>
            <StatusBadge tone={open ? "green" : "gray"}>{open ? "On Shift" : "Closed"}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#5f6268]">
            {open ? "In progress" : `${dt(shift.clock_in_at)} / ${dt(shift.clock_out_at)}`} /{" "}
            {duration(shift.duration_seconds)}
          </p>
        </div>
        <div className="flex shrink-0 gap-6 text-right">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
              Distance
            </p>
            <p className="mt-1 text-sm font-bold text-[#101217]">
              {Number(shift.distance_km).toFixed(1)} km
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
              Fuel
            </p>
            <p className="mt-1 text-sm font-bold text-[#c96c83]">
              ${Number(shift.fuel_reimbursement).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}
