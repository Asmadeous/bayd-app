"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Plus, Trash2, Users } from "lucide-react"
import { z } from "zod"

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
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PasswordInput } from "@/components/ui/password-input"
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
  useCreateEmployee,
  useDeleteEmployee,
  useAdminAnalytics,
  type AnalyticsPeriod,
  type AnalyticsEmployee,
  type EmployeeInput,
} from "@/lib/hooks/use-admin"
import { useAdminPartners, type Partner } from "@/lib/hooks/use-partners"
import { adminEmployeesSteps } from "@/lib/tours/admin-employees-tour"

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })

const FSA_PATTERN = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/

function parseFsaInput(text: string): { fsas: string[]; invalid: string[] } {
  const invalid: string[] = []
  const fsas = Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
          const fsa = token.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3)
          if (!FSA_PATTERN.test(fsa)) invalid.push(token)
          return fsa
        })
        .filter((fsa) => FSA_PATTERN.test(fsa))
    )
  )
  return { fsas, invalid }
}

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "Year" },
  { key: "all", label: "All time" },
]

const STAFF_BLANK: EmployeeInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  title: "",
  partner_id: null,
  active: true,
  dispatchable: true,
  base_latitude: "",
  base_longitude: "",
  simplybook_unit_id: "",
  traccar_device_id: "",
}

type StaffFormErrors = Partial<Record<keyof EmployeeInput | "base", string>>

const optionalCoordinate = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => !value || Number(value) >= min && Number(value) <= max, `${label} is outside the valid range.`)

const staffSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .refine((value) => value.toLowerCase().endsWith("@baydspa.ca"), "Employee email must use @baydspa.ca."),
  phone: z.string().trim().optional(),
  password: z.string().optional().refine((value) => !value || value.length >= 8, "Password must be at least 8 characters."),
  title: z.string().trim().optional(),
  partner_id: z.number().nullable().optional(),
  active: z.boolean().optional(),
  dispatchable: z.boolean().optional(),
  base_latitude: optionalCoordinate("Latitude", -90, 90),
  base_longitude: optionalCoordinate("Longitude", -180, 180),
  simplybook_unit_id: z.string().trim().optional(),
  traccar_device_id: z.string().trim().optional(),
})

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

      {modal && <StaffModal mode={modal} partners={partners} onClose={() => setModal(null)} />}

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

interface Employee {
  id: number
  title: string | null
  photo_url: string | null
  bio: string | null
  years_experience: number | null
  on_shift: boolean
  active: boolean
  dispatchable: boolean
  base_latitude: string | null
  base_longitude: string | null
  simplybook_unit_id: string | null
  traccar_device_id: string | null
  service_fsas: string[]
  partner_id: number | null
  partner_name: string | null
  user: { first_name: string | null; last_name: string | null; email: string; phone: string | null }
}

function EmployeeCard({ employee, kpi, partners, onEdit }: { employee: Employee; kpi?: AnalyticsEmployee; partners: Partner[]; onEdit: () => void }) {
  const { toast } = useToast()
  const toggleShift = useToggleEmployeeShift(employee.id)
  const updateEmployee = useUpdateEmployee(employee.id)
  const deleteEmployee = useDeleteEmployee()
  const name = [employee.user?.first_name, employee.user?.last_name].filter(Boolean).join(" ")
  const [editingFsas, setEditingFsas] = useState(false)
  const [fsaText, setFsaText] = useState((employee.service_fsas ?? []).join(" "))
  const [fsaError, setFsaError] = useState<string | null>(null)

  function saveFsas() {
    const parsed = parseFsaInput(fsaText)
    if (parsed.invalid.length > 0) {
      const message = `Invalid FSA ${parsed.invalid.length === 1 ? "entry" : "entries"}: ${parsed.invalid.join(", ")}.`
      setFsaError(message)
      toast({ title: "Coverage not saved", description: message, variant: "error" })
      return
    }
    setFsaError(null)
    updateEmployee.mutate(
      { service_fsas: parsed.fsas },
      {
        onSuccess: () => {
          setEditingFsas(false)
          toast({ title: "Coverage saved", variant: "success" })
        },
        onError: (error: unknown) => {
          const message = getApiErrorMessage(error, "Could not update this staff member's coverage.")
          setFsaError(message)
          toast({ title: "Coverage not saved", description: message, variant: "error" })
        },
      }
    )
  }

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
          <StatusBadge tone={employee.on_shift ? "green" : "gray"}>
            {employee.on_shift ? "On Shift" : "Off Shift"}
          </StatusBadge>
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

        {/* Service areas (FSA coverage) */}
        <div className="mt-3 border-t border-black/8 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-[#5f6268]">
              Service areas · {employee.service_fsas?.length ?? 0} FSA
            </p>
            {!editingFsas && (
              <button className="text-[11px] font-semibold text-[#c96c83] hover:underline" onClick={() => setEditingFsas(true)}>
                Edit
              </button>
            )}
          </div>

          {editingFsas ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={fsaText}
                onChange={(e) => {
                  setFsaText(e.target.value)
                  setFsaError(null)
                }}
                rows={3}
                placeholder="L5N L5W M9C …"
                aria-invalid={Boolean(fsaError)}
                className={`w-full border px-2.5 py-2 text-xs font-mono uppercase focus:outline-none ${fsaError ? "border-[#b75c68] focus:border-[#b75c68]" : "border-black/15 focus:border-[#c96c83]"}`}
              />
              <p className="text-[10px] text-[#8a8d93]">Use Canadian FSA format, space or comma separated. {parseFsaInput(fsaText).fsas.length} valid.</p>
              {fsaError ? <p className="text-xs font-semibold text-[#b75c68]">{fsaError}</p> : null}
              <div className="flex gap-2">
                <Button size="xs" disabled={updateEmployee.isPending} onClick={saveFsas} style={{ background: "#c96c83", border: "none", color: "#fff" }}>Save</Button>
                <Button size="xs" variant="ghost" onClick={() => { setFsaText((employee.service_fsas ?? []).join(" ")); setFsaError(null); setEditingFsas(false) }}>Cancel</Button>
              </div>
            </div>
          ) : (employee.service_fsas?.length ?? 0) > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {employee.service_fsas.map((f) => (
                <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#101217]">{f}</span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-[#8a8d93]">No areas set — this provider won&apos;t be dispatched.</p>
          )}
        </div>

        {/* Performance KPIs */}
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-black/8 pt-3">
          <Kpi label="Completed" value={kpi?.bookings_completed ?? 0} />
          <Kpi label="Revenue" value={cad.format(kpi?.revenue ?? 0)} />
          <Kpi label="Rating" value={kpi?.average_rating != null ? kpi.average_rating.toFixed(1) : "—"} />
          <Kpi label="Cancels" value={kpi?.cancellations ?? 0} />
        </div>
        <Link
          href={`/dashboard/admin/employees/${employee.id}`}
          className="mt-3 inline-block text-xs font-semibold text-[#c96c83] hover:underline"
        >
          View detailed KPIs →
        </Link>
      </div>
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

const inputCls =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputCls =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"

function StaffModal({ mode, partners, onClose }: { mode: "create" | Employee; partners: Partner[]; onClose: () => void }) {
  const { toast } = useToast()
  const isCreate = mode === "create"
  const emp = isCreate ? null : mode
  const create = useCreateEmployee()
  const update = useUpdateEmployee(emp?.id ?? 0)
  const [formErrors, setFormErrors] = useState<StaffFormErrors>({})

  const [form, setForm] = useState<EmployeeInput>({
    ...STAFF_BLANK,
    first_name: emp?.user.first_name ?? STAFF_BLANK.first_name,
    last_name: emp?.user.last_name ?? STAFF_BLANK.last_name,
    email: emp?.user.email ?? STAFF_BLANK.email,
    phone: emp?.user.phone ?? STAFF_BLANK.phone,
    title: emp?.title ?? STAFF_BLANK.title,
    partner_id: emp?.partner_id ?? STAFF_BLANK.partner_id,
    active: emp?.active ?? STAFF_BLANK.active,
    dispatchable: emp?.dispatchable ?? STAFF_BLANK.dispatchable,
    base_latitude: emp?.base_latitude ?? STAFF_BLANK.base_latitude,
    base_longitude: emp?.base_longitude ?? STAFF_BLANK.base_longitude,
    simplybook_unit_id: emp?.simplybook_unit_id ?? STAFF_BLANK.simplybook_unit_id,
    traccar_device_id: emp?.traccar_device_id ?? STAFF_BLANK.traccar_device_id,
  })

  function set(patch: Partial<EmployeeInput>) {
    setForm((current) => ({ ...current, ...patch }))
    setFormErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch) as (keyof EmployeeInput)[]) delete next[key]
      delete next.base
      return next
    })
  }

  function save() {
    const result = staffSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getStaffFieldErrors(result.error)
      setFormErrors(nextErrors)
      toast({
        title: "Staff form needs attention",
        description: nextErrors.base,
        variant: "error",
      })
      return
    }
    setFormErrors({})
    const payload: EmployeeInput = {
      first_name: cleanString(form.first_name),
      last_name: cleanString(form.last_name),
      email: cleanString(form.email),
      phone: cleanString(form.phone),
      title: cleanString(form.title),
      partner_id: form.partner_id,
      active: form.active,
      dispatchable: form.dispatchable,
      base_latitude: cleanString(form.base_latitude) || null,
      base_longitude: cleanString(form.base_longitude) || null,
      simplybook_unit_id: cleanString(form.simplybook_unit_id) || null,
      traccar_device_id: cleanString(form.traccar_device_id) || null,
    }
    if (isCreate && form.password) payload.password = form.password
    const opts = {
      onSuccess: () => {
        toast({
          title: isCreate ? "Staff member created" : "Staff member saved",
          variant: "success",
        })
        onClose()
      },
      onError: (error: unknown) => {
        const message = getApiErrorMessage(error, isCreate ? "Could not create this staff member." : "Could not update this staff member.")
        setFormErrors({ base: message })
        toast({
          title: isCreate ? "Staff member not created" : "Staff member not saved",
          description: message,
          variant: "error",
        })
      },
    }
    if (isCreate) create.mutate(payload, opts)
    else update.mutate(payload, opts)
  }

  const busy = create.isPending || update.isPending

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent data-tour="employees-editor">
        <DialogHeader className="pr-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
            Staff editor
          </p>
          <DialogTitle className="mt-1">
            {isCreate ? "Add Staff" : "Edit Staff"}
          </DialogTitle>
          <DialogDescription>
            Manage the staff login, dispatch metadata, partner assignment, and availability flags.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {formErrors.base ? (
            <div
              aria-live="polite"
              className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
            >
              {formErrors.base}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field error={formErrors.first_name} label="First name">
              <input
                aria-invalid={Boolean(formErrors.first_name)}
                className={fieldClass(formErrors.first_name)}
                onChange={(e) => set({ first_name: e.target.value })}
                value={form.first_name ?? ""}
              />
            </Field>
            <Field error={formErrors.last_name} label="Last name">
              <input
                aria-invalid={Boolean(formErrors.last_name)}
                className={fieldClass(formErrors.last_name)}
                onChange={(e) => set({ last_name: e.target.value })}
                value={form.last_name ?? ""}
              />
            </Field>
            <Field error={formErrors.email} label="Email">
              <input
                aria-invalid={Boolean(formErrors.email)}
                className={fieldClass(formErrors.email)}
                onChange={(e) => set({ email: e.target.value })}
                type="email"
                value={form.email ?? ""}
              />
            </Field>
            <Field error={formErrors.phone} label="Phone">
              <input
                aria-invalid={Boolean(formErrors.phone)}
                className={fieldClass(formErrors.phone)}
                onChange={(e) => set({ phone: e.target.value })}
                value={form.phone ?? ""}
              />
            </Field>
            {isCreate && (
              <Field error={formErrors.password} label="Temp password (optional)">
                <PasswordInput
                  aria-invalid={Boolean(formErrors.password)}
                  className={fieldClass(formErrors.password)}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder="auto-generated if blank"
                  value={form.password ?? ""}
                />
              </Field>
            )}
            <Field error={formErrors.title} label="Title">
              <input
                aria-invalid={Boolean(formErrors.title)}
                className={fieldClass(formErrors.title)}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Nail Technician"
                value={form.title ?? ""}
              />
            </Field>
            <Field label="Partner">
              <Select
                onValueChange={(value) => set({ partner_id: value ? Number(value) : null })}
                value={form.partner_id != null ? String(form.partner_id) : ""}
              >
                <SelectTrigger>
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
            </Field>
            <Field error={formErrors.base_latitude} label="Base latitude">
              <input
                aria-invalid={Boolean(formErrors.base_latitude)}
                className={fieldClass(formErrors.base_latitude)}
                onChange={(e) => set({ base_latitude: e.target.value })}
                placeholder="43.65"
                value={form.base_latitude ?? ""}
              />
            </Field>
            <Field error={formErrors.base_longitude} label="Base longitude">
              <input
                aria-invalid={Boolean(formErrors.base_longitude)}
                className={fieldClass(formErrors.base_longitude)}
                onChange={(e) => set({ base_longitude: e.target.value })}
                placeholder="-79.38"
                value={form.base_longitude ?? ""}
              />
            </Field>
            <Field error={formErrors.simplybook_unit_id} label="SimplyBook Provider (unit) ID">
              <input
                aria-invalid={Boolean(formErrors.simplybook_unit_id)}
                className={fieldClass(formErrors.simplybook_unit_id)}
                onChange={(e) => set({ simplybook_unit_id: e.target.value })}
                placeholder="e.g. 3"
                value={form.simplybook_unit_id ?? ""}
              />
            </Field>
            <Field error={formErrors.traccar_device_id} label="Traccar Device ID">
              <input
                aria-invalid={Boolean(formErrors.traccar_device_id)}
                className={fieldClass(formErrors.traccar_device_id)}
                onChange={(e) => set({ traccar_device_id: e.target.value })}
                placeholder="matches the Traccar phone app"
                value={form.traccar_device_id ?? ""}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set({ active: e.target.checked })} className="accent-[#c96c83]" /> Active
            </label>
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
              <input type="checkbox" checked={!!form.dispatchable} onChange={(e) => set({ dispatchable: e.target.checked })} className="accent-[#c96c83]" /> Dispatchable
            </label>
          </div>
          {isCreate && <p className="mt-4 text-[11px] text-[#8a8d93]">Coverage FSAs are set on the staff card after creating.</p>}
        </DialogBody>

        <DialogFooter>
          <Button size="sm" disabled={busy} onClick={save} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            {busy ? "Saving..." : isCreate ? "Create" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputCls} ${error ? errorInputCls : ""}`
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getStaffFieldErrors(error: z.ZodError<EmployeeInput>): StaffFormErrors {
  const next: StaffFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !next[key as keyof StaffFormErrors]) {
      next[key as keyof StaffFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
