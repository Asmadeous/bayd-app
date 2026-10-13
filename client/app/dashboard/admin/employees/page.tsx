"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Users } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StaffHoursSheet } from "@/components/dashboard/staff-hours-sheet"
import { StaffCoverageEditor, StaffFormDialog, type StaffEmployee } from "@/components/dashboard/staff-editor"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminEmployees,
  useToggleEmployeeShift,
  useUpdateEmployee,
  useDeleteEmployee,
  useAdminAnalytics,
  type AnalyticsPeriod,
  type AnalyticsEmployee,
} from "@/lib/hooks/use-admin"
import { useAdminPartners, type Partner } from "@/lib/hooks/use-partners"
import { adminEmployeesSteps } from "@/lib/tours/admin-employees-tour"
import { formatMoney } from "@/lib/stores/franchise-store"

// Whole amounts in the franchise's currency.
const cad = { format: (value: number) => formatMoney(value, { maximumFractionDigits: 0 }) }

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "Year" },
  { key: "all", label: "All time" },
]

export default function AdminEmployeesPage() {
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [modal, setModal] = useState<"create" | Employee | null>(null)
  const { data, isLoading } = useAdminEmployees(page)
  const { data: analytics } = useAdminAnalytics(period)
  const { data: partnersData } = useAdminPartners()
  const employees = data?.data ?? []
  const partners = partnersData?.data ?? []
  const pagination = data?.pagination

  // Map employee_id -> KPI row from the analytics leaderboard.
  const kpiById = new Map<number, AnalyticsEmployee>(
    (analytics?.employees ?? []).map((e) => [e.id, e]),
  )

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="employees-header">
        <DashboardHeader
          title="Employees"
          subtitle="Profiles, shifts, dispatch coverage, partners, and performance KPIs."
          actions={
            <Button
              size="sm"
              onClick={() => setModal("create")}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Staff
            </Button>
          }
        />
      </div>

      {modal && <StaffFormDialog mode={modal} partners={partners} onClose={() => setModal(null)} />}

      <DashboardToolbar data-tour="employees-kpi-period">
        <ToolbarSection>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">
            KPIs for
          </span>
          <SegmentedControl>
            {PERIODS.map((periodOption) => (
              <SegmentButton
                active={period === periodOption.key}
                key={periodOption.key}
                onClick={() => setPeriod(periodOption.key)}
              >
                {periodOption.label}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {employees.length} visible employees
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading employees...</p>
        </DashboardPanel>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Employee profiles and performance details will appear here."
          action={
            <Button
              size="sm"
              onClick={() => setModal("create")}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Staff
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2" data-tour="employees-list">
          {employees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} kpi={kpiById.get(emp.id)} partners={partners} onEdit={() => setModal(emp)} />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <DashboardToolbar className="justify-end" data-tour="employees-pagination">
          <ToolbarSection className="ml-auto">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}

      <TutorialButton steps={adminEmployeesSteps} pageKey="admin-employees" />
    </DashboardPage>
  )
}

type Employee = StaffEmployee

function EmployeeCard({ employee, kpi, partners, onEdit }: { employee: Employee; kpi?: AnalyticsEmployee; partners: Partner[]; onEdit: () => void }) {
  const { toast } = useToast()
  const toggleShift = useToggleEmployeeShift(employee.id)
  const updateEmployee = useUpdateEmployee(employee.id)
  const deleteEmployee = useDeleteEmployee()
  const name = [employee.user?.first_name, employee.user?.last_name].filter(Boolean).join(" ")
  const [hoursOpen, setHoursOpen] = useState(false)

  function assignPartner(value: string) {
    updateEmployee.mutate(
      { partner_id: value ? Number(value) : null },
      {
        onError: (error: unknown) => {
          toast({
            title: "Partner not saved",
            description: getApiErrorMessage(error, "Could not update this staff member's partner."),
            variant: "error",
          })
        },
      }
    )
  }

  function toggleOnShift() {
    toggleShift.mutate(undefined, {
      onError: (error: unknown) => {
        toast({
          title: "Shift status not updated",
          description: getApiErrorMessage(error, "Could not update this staff member's shift status."),
          variant: "error",
        })
      },
    })
  }

  function remove() {
    deleteEmployee.mutate(employee.id, {
      onSuccess: () => {
        toast({ title: "Staff member deleted", description: `${name || "Staff member"} was removed.`, variant: "success" })
      },
      onError: (error: unknown) => {
        toast({
          title: "Staff member not deleted",
          description: getApiErrorMessage(error, "This staff member could not be deleted."),
          variant: "error",
        })
      },
    })
  }

  return (
    <DashboardPanel className="flex items-start gap-4">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden border border-black/10 bg-[#f4f1eb]">
        {employee.photo_url ? (
          <span
            aria-label={name}
            className="size-full bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${employee.photo_url})` }}
          />
        ) : (
          <div className="size-full flex items-center justify-center font-extrabold text-[#5f6268]">
            {name?.[0] ?? "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-[#101217]">{name}</p>
            {employee.title && <p className="text-xs font-bold text-[#a36f4d]">{employee.title}</p>}
            <p className="mt-1 truncate text-xs text-[#5f6268]">{employee.user?.email}</p>
          </div>
          <span className="flex flex-wrap gap-1.5">
            {!employee.dispatchable ? <StatusBadge tone="red">Auto-assign paused</StatusBadge> : null}
            <StatusBadge tone={employee.on_shift ? "green" : "gray"}>
              {employee.on_shift ? "On Shift" : "Off Shift"}
            </StatusBadge>
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Button
            size="xs"
            variant="outline"
            disabled={toggleShift.isPending}
            onClick={toggleOnShift}
          >
            Toggle Shift
          </Button>
          <Button size="xs" variant="outline" onClick={onEdit}>Edit</Button>
          <Button size="xs" variant="outline" onClick={() => setHoursOpen(true)}>Hours</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="xs" variant="outline" disabled={deleteEmployee.isPending}>
                <Trash2 className="size-3.5 text-[#d4754a]" />
                <span className="sr-only">Delete {name || "staff member"}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {name || "this staff member"}&apos;s profile and login. Staff with bookings or tips cannot be deleted; set them inactive instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Delete staff member</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Partner assignment */}
        <div className="mt-3 border-t border-black/8 pt-3 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-[#5f6268]">Partner</p>
          <Select
            disabled={updateEmployee.isPending}
            onValueChange={(value) => assignPartner(value ?? "")}
            value={employee.partner_id != null ? String(employee.partner_id) : ""}
          >
            <SelectTrigger className="h-8 max-w-[60%] text-xs">
              <SelectValue placeholder="In-house (B.A.Y.D)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">In-house (B.A.Y.D)</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={String(partner.id)}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <StaffCoverageEditor employee={employee} />

        {/* Performance KPIs */}
        <div className="mt-3 grid grid-cols-5 gap-2 border-t border-black/8 pt-3">
          <Kpi label="Completed" value={kpi?.bookings_completed ?? 0} />
          <Kpi label="Revenue" value={cad.format(kpi?.revenue ?? 0)} />
          <Kpi label="Rating" value={kpi?.average_rating != null ? kpi.average_rating.toFixed(1) : "—"} />
          <Kpi label="Cancels" value={kpi?.cancellations ?? 0} />
          <Kpi label="Missed" value={kpi?.missed ?? 0} />
        </div>
        <Link
          href={`/dashboard/admin/employees/detail?id=${employee.id}`}
          className="mt-3 inline-block text-xs font-semibold text-[#c96c83] hover:underline"
        >
          View detailed KPIs →
        </Link>
      </div>
      <StaffHoursSheet
        employeeId={employee.id}
        name={name}
        dispatchable={employee.dispatchable}
        open={hoursOpen}
        onOpenChange={setHoursOpen}
      />
    </DashboardPanel>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm font-bold text-[#101217] leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[#5f6268]">{label}</p>
    </div>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
