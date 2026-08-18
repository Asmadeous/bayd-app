"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Users } from "lucide-react"
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
import { Button } from "@/components/ui/button"
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

// Split a blob into valid FSAs (first 3 chars, e.g. "L5N"), de-duped.
function parseFsas(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((s) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3))
        .filter((s) => s.length === 3)
    )
  )
}

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
  const toggleShift = useToggleEmployeeShift(employee.id)
  const updateEmployee = useUpdateEmployee(employee.id)
  const deleteEmployee = useDeleteEmployee()
  const name = [employee.user?.first_name, employee.user?.last_name].filter(Boolean).join(" ")
  const [editingFsas, setEditingFsas] = useState(false)
  const [fsaText, setFsaText] = useState((employee.service_fsas ?? []).join(" "))

  function saveFsas() {
    updateEmployee.mutate(
      { service_fsas: parseFsas(fsaText) },
      { onSuccess: () => setEditingFsas(false) }
    )
  }

  function remove() {
    if (!confirm(`Delete ${name || "this staff member"}? This removes their login.`)) return
    deleteEmployee.mutate(employee.id, {
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        alert(msg ?? "Couldn't delete this staff member.")
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
            onClick={() => toggleShift.mutate()}
          >
            Toggle Shift
          </Button>
          <Button size="xs" variant="outline" onClick={onEdit}>Edit</Button>
          <Button size="xs" variant="outline" disabled={deleteEmployee.isPending} onClick={remove}>
            <Trash2 className="size-3.5 text-[#d4754a]" />
          </Button>
        </div>

        {/* Partner assignment */}
        <div className="mt-3 border-t border-black/8 pt-3 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-[#5f6268]">Partner</p>
          <Select
            disabled={updateEmployee.isPending}
            onValueChange={(value) => updateEmployee.mutate({ partner_id: value ? Number(value) : null })}
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
                onChange={(e) => setFsaText(e.target.value)}
                rows={3}
                placeholder="L5N L5W M9C …"
                className="w-full border border-black/15 rounded-lg px-2.5 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#c96c83]"
              />
              <p className="text-[10px] text-[#8a8d93]">First 3 characters only (FSA), space or comma separated. {parseFsas(fsaText).length} valid.</p>
              <div className="flex gap-2">
                <Button size="xs" disabled={updateEmployee.isPending} onClick={saveFsas} style={{ background: "#c96c83", border: "none", color: "#fff" }}>Save</Button>
                <Button size="xs" variant="ghost" onClick={() => { setFsaText((employee.service_fsas ?? []).join(" ")); setEditingFsas(false) }}>Cancel</Button>
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

function StaffModal({ mode, partners, onClose }: { mode: "create" | Employee; partners: Partner[]; onClose: () => void }) {
  const isCreate = mode === "create"
  const emp = isCreate ? null : mode
  const create = useCreateEmployee()
  const update = useUpdateEmployee(emp?.id ?? 0)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<EmployeeInput>({
    first_name: emp?.user.first_name ?? "",
    last_name: emp?.user.last_name ?? "",
    email: emp?.user.email ?? "",
    phone: emp?.user.phone ?? "",
    password: "",
    title: emp?.title ?? "",
    partner_id: emp?.partner_id ?? null,
    active: emp?.active ?? true,
    dispatchable: emp?.dispatchable ?? true,
    base_latitude: emp?.base_latitude ?? "",
    base_longitude: emp?.base_longitude ?? "",
    simplybook_unit_id: emp?.simplybook_unit_id ?? "",
    traccar_device_id: emp?.traccar_device_id ?? "",
  })
  const set = (patch: Partial<EmployeeInput>) => setForm((f) => ({ ...f, ...patch }))

  function save() {
    setError(null)
    const payload: EmployeeInput = {
      first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone,
      title: form.title, partner_id: form.partner_id, active: form.active, dispatchable: form.dispatchable,
      base_latitude: form.base_latitude || null, base_longitude: form.base_longitude || null,
      simplybook_unit_id: form.simplybook_unit_id,
      traccar_device_id: form.traccar_device_id,
    }
    if (isCreate && form.password) payload.password = form.password
    const opts = {
      onSuccess: onClose,
      onError: (e: unknown) => {
        const d = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
        setError(d?.error ?? d?.errors?.join(", ") ?? "Something went wrong.")
      },
    }
    if (isCreate) create.mutate(payload, opts)
    else update.mutate(payload, opts)
  }

  const busy = create.isPending || update.isPending

  return (
    <DashboardPanel>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          Staff editor
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-[#101217]">
          {isCreate ? "Add Staff" : "Edit Staff"}
        </h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="First name"><input value={form.first_name ?? ""} onChange={(e) => set({ first_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Last name"><input value={form.last_name ?? ""} onChange={(e) => set({ last_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Email"><input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} className={inputCls} /></Field>
        <Field label="Phone"><input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} className={inputCls} /></Field>
        {isCreate && (
          <Field label="Temp password (optional)">
            <PasswordInput value={form.password ?? ""} onChange={(e) => set({ password: e.target.value })} placeholder="auto-generated if blank" className={inputCls} />
          </Field>
        )}
        <Field label="Title"><input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Nail Technician" className={inputCls} /></Field>
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
        <Field label="Base latitude"><input value={form.base_latitude ?? ""} onChange={(e) => set({ base_latitude: e.target.value })} placeholder="43.65" className={inputCls} /></Field>
        <Field label="Base longitude"><input value={form.base_longitude ?? ""} onChange={(e) => set({ base_longitude: e.target.value })} placeholder="-79.38" className={inputCls} /></Field>
        <Field label="SimplyBook Provider (unit) ID"><input value={form.simplybook_unit_id ?? ""} onChange={(e) => set({ simplybook_unit_id: e.target.value })} placeholder="e.g. 3" className={inputCls} /></Field>
        <Field label="Traccar Device ID"><input value={form.traccar_device_id ?? ""} onChange={(e) => set({ traccar_device_id: e.target.value })} placeholder="matches the device ID in the Traccar phone app" className={inputCls} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
          <input type="checkbox" checked={!!form.active} onChange={(e) => set({ active: e.target.checked })} className="accent-[#c96c83]" /> Active
        </label>
        <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
          <input type="checkbox" checked={!!form.dispatchable} onChange={(e) => set({ dispatchable: e.target.checked })} className="accent-[#c96c83]" /> Dispatchable
        </label>
      </div>
      {error && <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="mt-5 flex gap-2">
        <Button size="sm" disabled={busy || !form.email || !form.first_name} onClick={save} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {isCreate ? "Create" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      {isCreate && <p className="text-[11px] text-[#8a8d93]">Coverage FSAs are set on the staff card after creating.</p>}
    </DashboardPanel>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</label>
      {children}
    </div>
  )
}
