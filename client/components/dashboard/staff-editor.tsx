"use client"

import { useState, type ReactNode } from "react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PasswordInput } from "@/components/ui/password-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateEmployee, useUpdateEmployee, type EmployeeInput } from "@/lib/hooks/use-admin"
import type { Partner } from "@/lib/hooks/use-partners"
import { franchiseConfig, staffEmailDomain } from "@/lib/stores/franchise-store"

// The staff editor and coverage editor, shared by the web Employees page and
// the BAYD Admin app so both create, edit and cover staff the same way.

const FSA_PATTERN = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/
// Outside Canada a tech lists postal-code prefixes ("SW1A", "M1", "100").
const PREFIX_PATTERN = /^[A-Z0-9]{1,8}$/

export function parseFsaInput(text: string, canada = franchiseConfig().country_code === "CA"): { fsas: string[]; invalid: string[] } {
  const invalid: string[] = []
  const pattern = canada ? FSA_PATTERN : PREFIX_PATTERN
  const fsas = Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
          const cleaned = token.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
          const fsa = canada ? cleaned.slice(0, 3) : cleaned
          if (!pattern.test(fsa)) invalid.push(token)
          return fsa
        })
        .filter((fsa) => pattern.test(fsa))
    )
  )
  return { fsas, invalid }
}

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
    .refine((value) => value.toLowerCase().endsWith(`@${staffEmailDomain()}`), {
      error: () => `Employee email must use @${staffEmailDomain()}.`,
    }),
  phone: z.string().trim().optional(),
  password: z.string().optional().refine((value) => !value || value.length >= 8, "Password must be at least 8 characters."),
  title: z.string().trim().optional(),
  partner_id: z.number().nullable().optional(),
  active: z.boolean().optional(),
  dispatchable: z.boolean().optional(),
  base_latitude: optionalCoordinate("Latitude", -90, 90),
  base_longitude: optionalCoordinate("Longitude", -180, 180),
})

export interface StaffEmployee {
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
  service_fsas: string[]
  service_radius_km?: string | null
  partner_id: number | null
  partner_name: string | null
  user: { first_name: string | null; last_name: string | null; email: string; phone: string | null }
}

// A staff member's service areas: postal prefixes (FSAs in Canada) and/or a
// radius around their base, edited in place.
export function StaffCoverageEditor({
  employee,
  className = "mt-3 border-t border-black/8 pt-3",
}: {
  employee: StaffEmployee
  className?: string
}) {
  const { toast } = useToast()
  const updateEmployee = useUpdateEmployee(employee.id)
  const [editingFsas, setEditingFsas] = useState(false)
  const [fsaText, setFsaText] = useState((employee.service_fsas ?? []).join(" "))
  const [radiusText, setRadiusText] = useState(employee.service_radius_km ? String(Number(employee.service_radius_km)) : "")
  const canada = franchiseConfig().country_code === "CA"
  const areaWord = canada ? "FSA" : "postal prefix"
  const [fsaError, setFsaError] = useState<string | null>(null)

  function saveFsas() {
    const parsed = parseFsaInput(fsaText)
    if (parsed.invalid.length > 0) {
      const message = `Invalid ${areaWord} ${parsed.invalid.length === 1 ? "entry" : "entries"}: ${parsed.invalid.join(", ")}.`
      setFsaError(message)
      toast({ title: "Coverage not saved", description: message, variant: "error" })
      return
    }
    const radius = radiusText.trim() === "" ? null : Number(radiusText)
    if (radius != null && (!Number.isFinite(radius) || radius <= 0)) {
      setFsaError("The radius must be a number of kilometres above 0.")
      return
    }
    setFsaError(null)
    updateEmployee.mutate(
      { service_fsas: parsed.fsas, service_radius_km: radius },
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

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-[#5f6268]">
          Service areas · {employee.service_fsas?.length ?? 0} {areaWord}
          {employee.service_radius_km ? ` · ${Number(employee.service_radius_km)} km radius` : ""}
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
          <p className="text-[10px] text-[#8a8d93]">
            {canada ? "Use Canadian FSA format" : "Postal-code prefixes"}, space or comma separated. {parseFsaInput(fsaText).fsas.length} valid.
          </p>
          <label className="block text-[10px] uppercase tracking-wide text-[#5f6268]">
            Or a radius around their base (km)
            <input
              value={radiusText}
              onChange={(e) => { setRadiusText(e.target.value); setFsaError(null) }}
              inputMode="decimal"
              placeholder="e.g. 15"
              className="mt-1 w-full border border-black/15 px-2.5 py-1.5 text-xs focus:border-[#c96c83] focus:outline-none"
            />
          </label>
          {fsaError ? <p className="text-xs font-semibold text-[#b75c68]">{fsaError}</p> : null}
          <div className="flex gap-2">
            <Button size="xs" disabled={updateEmployee.isPending} onClick={saveFsas} style={{ background: "#c96c83", border: "none", color: "#fff" }}>Save</Button>
            <Button size="xs" variant="ghost" onClick={() => { setFsaText((employee.service_fsas ?? []).join(" ")); setRadiusText(employee.service_radius_km ? String(Number(employee.service_radius_km)) : ""); setFsaError(null); setEditingFsas(false) }}>Cancel</Button>
          </div>
        </div>
      ) : (employee.service_fsas?.length ?? 0) > 0 || employee.service_radius_km ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {employee.service_fsas.map((f) => (
            <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#101217]">{f}</span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-[#8a8d93]">No areas set — this provider won&apos;t be dispatched.</p>
      )}
    </div>
  )
}

const inputCls =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputCls =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"

export function StaffFormDialog({ mode, partners, onClose }: { mode: "create" | StaffEmployee; partners: Partner[]; onClose: () => void }) {
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
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set({ active: e.target.checked })} className="accent-[#c96c83]" /> Active
            </label>
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217]">
              <input type="checkbox" checked={!!form.dispatchable} onChange={(e) => set({ dispatchable: e.target.checked })} className="accent-[#c96c83]" /> Dispatchable
            </label>
          </div>
          {isCreate && <p className="mt-4 text-[11px] text-[#8a8d93]">Coverage areas are set on the staff card after creating.</p>}
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
