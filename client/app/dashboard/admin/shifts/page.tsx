"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  formatDate(s)

const name = (u?: { first_name: string | null; last_name: string | null; email: string }) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : "-"

function duration(secs: number): string {
  if (!Number.isFinite(Number(secs)) || Number(secs) < 0) return "-"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AdminShiftsPage() {
  const { toast } = useToast()
  const [filters, setFilters] = useState<AdminShiftFilters>({ page: 1 })
  const [dateError, setDateError] = useState<string | null>(null)
  const { data, isError, isLoading } = useAdminShifts(filters)
  const { data: employees } = useAdminEmployees(1)
  const del = useDeleteShift()
  const shifts = data?.data ?? []
  const totals = data?.totals

  useEffect(() => {
    if (isError) {
      toast({
        title: "Shifts not loaded",
        description: "Could not load fuel compensation records. Try refreshing the page.",
        variant: "error",
      })
    }
  }, [isError, toast])

  function set(patch: Partial<AdminShiftFilters>) {
    const next = { ...filters, ...patch, page: 1 }
    const nextError = validateDateRange(next.from, next.to)
    setDateError(nextError)
    if (!nextError) setFilters(next)
  }

  function clearFilters() {
    setDateError(null)
    setFilters({ page: 1 })
  }

  function deleteShift(shift: Shift) {
    del.mutate(shift.id, {
      onSuccess: () => toast({ title: "Shift deleted", variant: "success" }),
      onError: (error: unknown) => {
        toast({
          title: "Shift not deleted",
          description: getApiErrorMessage(error, "Could not delete this shift record."),
          variant: "error",
        })
      },
    })
  }

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
            <Button onClick={clearFilters} size="sm" variant="outline">
              Clear
            </Button>
          </ToolbarSection>
        ) : null}
      </DashboardToolbar>
      {dateError ? (
        <DashboardPanel className="border-[#b75c68]/25 bg-[#fff5f6]">
          <p className="text-sm font-semibold text-[#8f3f4b]">{dateError}</p>
        </DashboardPanel>
      ) : null}

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
                  {formatKm(shift.distance_km)}
                </DataTableCell>
                <DataTableCell className="text-right font-bold text-[#c96c83]">
                  {formatCurrency(shift.fuel_reimbursement)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={del.isPending}
                          size="xs"
                          variant="outline"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5 text-[#d4754a]" />
                          <span className="sr-only">Delete shift record</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete shift record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {shift.status === "open"
                              ? "This shift is still open. Deleting it removes the active clock-in record and any tracked fuel compensation."
                              : "This permanently removes the shift and its fuel compensation totals from this report."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteShift(shift)}>
                            Delete shift
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

function validateDateRange(from?: string, to?: string) {
  if (!from || !to) return null
  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return "Use valid dates for the fuel compensation range."
  return toDate < fromDate ? "To date must be on or after the From date." : null
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-CA", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

function formatKm(value: unknown) {
  const km = Number(value)
  return Number.isFinite(km) ? `${km.toFixed(1)} km` : "-"
}

function formatCurrency(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
