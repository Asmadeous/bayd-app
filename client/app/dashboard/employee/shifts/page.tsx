"use client"

import { useEffect, useState } from "react"
import { Fuel } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
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

function dt(s: string | null) {
  if (!s) return "-"
  const date = new Date(s)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-CA", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })
}

function duration(secs: unknown): string {
  const value = Number(secs)
  if (!Number.isFinite(value) || value < 0) return "-"

  const safeSecs = Math.floor(value)
  const h = Math.floor(safeSecs / 3600)
  const m = Math.floor((safeSecs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function EmployeeShiftsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const { data, isError, isLoading } = useShifts(page)
  const shifts = data?.data ?? []
  const totals = data?.totals

  useEffect(() => {
    if (isError) {
      toast({
        title: "Shifts not loaded",
        description: "Could not load your shift history.",
        variant: "error",
      })
    }
  }, [isError, toast])

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
        <StatCard label="Distance Travelled" value={formatDistance(totals?.distance_km)} />
        <StatCard label="Fuel Reimbursement" value={formatCurrency(totals?.fuel_reimbursement)} accent />
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
              {formatDistance(shift.distance_km)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
              Fuel
            </p>
            <p className="mt-1 text-sm font-bold text-[#c96c83]">
              {formatCurrency(shift.fuel_reimbursement)}
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}

function formatDistance(value: unknown) {
  const distance = Number(value ?? 0)
  return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "-"
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}
