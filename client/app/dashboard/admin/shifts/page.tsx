"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/dashboard/data-table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminEmployees } from "@/lib/hooks/use-admin"
import { useAdminShifts, useDeleteShift, type AdminShiftFilters, type Shift } from "@/lib/hooks/use-time-clock"
import { adminShiftsSteps } from "@/lib/tours/admin-shifts-tour"

const dt = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-CA", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })
    : "-"

const name = (u?: { first_name: string | null; last_name: string | null; email: string }) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : "-"

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

  const set = (patch: Partial<AdminShiftFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }))

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-shifts-header">
        <DashboardHeader
          title="Fuel Compensation"
          subtitle="Staff shifts, travel distance, and reimbursement owed."
        />
      </div>

      <DashboardToolbar data-tour="admin-shifts-filters">
        <ToolbarSection>
          <Field label="Employee">
            <Select
              onValueChange={(value) => set({ employee_profile_id: value || undefined })}
              value={filters.employee_profile_id != null ? String(filters.employee_profile_id) : ""}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All employees</SelectItem>
                {employees?.data.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {name(employee.user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              onValueChange={(value) => set({ status: value || undefined })}
              value={filters.status ?? ""}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="open">On shift</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="From">
            <DatePicker
              className="h-10 w-40"
              onChange={(value) => set({ from: value || undefined })}
              placeholder="From date"
              value={filters.from ?? ""}
            />
          </Field>
          <Field label="To">
            <DatePicker
              className="h-10 w-40"
              min={filters.from}
              onChange={(value) => set({ to: value || undefined })}
              placeholder="To date"
              value={filters.to ?? ""}
            />
          </Field>
        </ToolbarSection>
        {(filters.employee_profile_id || filters.status || filters.from || filters.to) ? (
          <ToolbarSection>
            <Button onClick={() => setFilters({ page: 1 })} size="sm" variant="outline">
              Clear
            </Button>
          </ToolbarSection>
        ) : null}
      </DashboardToolbar>

      <div className="grid gap-4 md:grid-cols-3" data-tour="admin-shifts-stats">
        <StatCard label="Shifts" value={totals?.shifts ?? 0} />
        <StatCard label="Total Distance" value={`${(totals?.distance_km ?? 0).toFixed(1)} km`} />
        <StatCard label="Total Owed" value={`$${(totals?.fuel_reimbursement ?? 0).toFixed(2)}`} accent />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading shifts...</p>
        </DashboardPanel>
      ) : shifts.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No shifts found"
          description="Adjust the filters to find another shift record."
        />
      ) : (
        <div data-tour="admin-shifts-list">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Employee</DataTableHeaderCell>
              <DataTableHeaderCell>Clock In</DataTableHeaderCell>
              <DataTableHeaderCell>Clock Out</DataTableHeaderCell>
              <DataTableHeaderCell>Duration</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Distance</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Reimbursement</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {shifts.map((shift: Shift) => (
              <DataTableRow key={shift.id}>
                <DataTableCell className="font-bold text-[#101217]">
                  {name(shift.employee_profile?.user)}
                </DataTableCell>
                <DataTableCell>{dt(shift.clock_in_at)}</DataTableCell>
                <DataTableCell>
                  {shift.status === "open" ? (
                    <StatusBadge tone="green">On Shift</StatusBadge>
                  ) : (
                    dt(shift.clock_out_at)
                  )}
                </DataTableCell>
                <DataTableCell>{duration(shift.duration_seconds)}</DataTableCell>
                <DataTableCell className="text-right font-semibold text-[#101217]">
                  {Number(shift.distance_km).toFixed(1)} km
                </DataTableCell>
                <DataTableCell className="text-right font-bold text-[#c96c83]">
                  ${Number(shift.fuel_reimbursement).toFixed(2)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <Button
                      disabled={del.isPending}
                      onClick={() => {
                        if (confirm("Delete this shift record?")) del.mutate(shift.id)
                      }}
                      size="xs"
                      variant="outline"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5 text-[#d4754a]" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {filters.page ?? 1} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={adminShiftsSteps} pageKey="admin-shifts" />
    </DashboardPage>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
        {label}
      </span>
      {children}
    </div>
  )
}
