"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-6">
      <DashboardHeader
        title="Employees"
        subtitle="Profiles, shifts, and performance KPIs"
        actions={<Button size="sm" onClick={() => setModal("create")} style={{ background: "#c96c83", border: "none", color: "#fff" }}>+ Add Staff</Button>}
      />

      {modal && <StaffModal mode={modal} partners={partners} onClose={() => setModal(null)} />}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#5f6268]">KPIs for:</span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={
              period === p.key
                ? { background: "#c96c83", color: "#fff" }
                : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No employees found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {employees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} kpi={kpiById.get(emp.id)} partners={partners} onEdit={() => setModal(emp)} />
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
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
    <div className="rounded-xl border border-black/8 bg-white p-5 flex items-start gap-4">
      <div className="size-10 rounded-full overflow-hidden bg-black/8 shrink-0">
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={name} className="size-full object-cover" />
        ) : (
          <div className="size-full flex items-center justify-center font-bold text-[#5f6268]">
            {name?.[0] ?? "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#101217] truncate">{name}</p>
        {employee.title && <p className="text-xs text-[#a36f4d]">{employee.title}</p>}
        <p className="text-xs text-[#5f6268] mt-0.5 truncate">{employee.user?.email}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={
              employee.on_shift
                ? { background: "#5a9e5a22", color: "#5a9e5a" }
                : { background: "#8a8d9322", color: "#8a8d93" }
            }
          >
            {employee.on_shift ? "On Shift" : "Off Shift"}
          </span>
          <Button
            size="xs"
            variant="ghost"
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
          <select
            value={employee.partner_id ?? ""}
            disabled={updateEmployee.isPending}
            onChange={(e) => updateEmployee.mutate({ partner_id: e.target.value ? Number(e.target.value) : null })}
            className="h-8 border border-black/15 rounded-lg px-2 text-xs bg-white focus:outline-none focus:border-[#c96c83] max-w-[60%]"
          >
            <option value="">In-house (B.A.Y.D)</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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
    </div>
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
  "w-full h-9 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"

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
    <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
      <h3 className="font-semibold text-sm text-[#101217]">{isCreate ? "Add Staff" : "Edit Staff"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name"><input value={form.first_name ?? ""} onChange={(e) => set({ first_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Last name"><input value={form.last_name ?? ""} onChange={(e) => set({ last_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Email"><input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} className={inputCls} /></Field>
        <Field label="Phone"><input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} className={inputCls} /></Field>
        {isCreate && (
          <Field label="Temp password (optional)">
            <input value={form.password ?? ""} onChange={(e) => set({ password: e.target.value })} placeholder="auto-generated if blank" className={inputCls} />
          </Field>
        )}
        <Field label="Title"><input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Nail Technician" className={inputCls} /></Field>
        <Field label="Partner">
          <select value={form.partner_id ?? ""} onChange={(e) => set({ partner_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
            <option value="">In-house (B.A.Y.D)</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Base latitude"><input value={form.base_latitude ?? ""} onChange={(e) => set({ base_latitude: e.target.value })} placeholder="43.65" className={inputCls} /></Field>
        <Field label="Base longitude"><input value={form.base_longitude ?? ""} onChange={(e) => set({ base_longitude: e.target.value })} placeholder="-79.38" className={inputCls} /></Field>
        <Field label="SimplyBook Provider (unit) ID"><input value={form.simplybook_unit_id ?? ""} onChange={(e) => set({ simplybook_unit_id: e.target.value })} placeholder="e.g. 3" className={inputCls} /></Field>
        <Field label="Traccar Device ID"><input value={form.traccar_device_id ?? ""} onChange={(e) => set({ traccar_device_id: e.target.value })} placeholder="matches the device ID in the Traccar phone app" className={inputCls} /></Field>
      </div>
      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-[#101217] cursor-pointer">
          <input type="checkbox" checked={!!form.active} onChange={(e) => set({ active: e.target.checked })} className="accent-[#c96c83]" /> Active
        </label>
        <label className="flex items-center gap-2 text-sm text-[#101217] cursor-pointer">
          <input type="checkbox" checked={!!form.dispatchable} onChange={(e) => set({ dispatchable: e.target.checked })} className="accent-[#c96c83]" /> Dispatchable
        </label>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !form.email || !form.first_name} onClick={save} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {isCreate ? "Create" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      {isCreate && <p className="text-[11px] text-[#8a8d93]">Coverage FSAs are set on the staff card after creating.</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5f6268] mb-1">{label}</label>
      {children}
    </div>
  )
}
