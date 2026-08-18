"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
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
import { useAdminServiceAreas, useUpdateServiceArea } from "@/lib/hooks/use-admin"
import { adminServiceAreasSteps } from "@/lib/tours/admin-service-areas-tour"

const fieldClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

type ServiceAreaFormState = {
  name: string
  travel_fee: string
  active: boolean
  center_latitude: string
  center_longitude: string
  radius_km: string
}

type ServiceAreaFormErrors = Partial<Record<keyof ServiceAreaFormState | "base", string>>

const blankForm: ServiceAreaFormState = {
  name: "",
  travel_fee: "",
  active: true,
  center_latitude: "",
  center_longitude: "",
  radius_km: "",
}

const optionalNumber = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)

const serviceAreaSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  travel_fee: z
    .string()
    .trim()
    .min(1, "Travel fee is required.")
    .refine((value) => Number.isFinite(Number(value)), "Travel fee must be a number.")
    .refine((value) => Number(value) >= 0, "Travel fee cannot be negative."),
  active: z.boolean(),
  center_latitude: optionalNumber("Latitude")
    .refine((value) => !value || Number(value) >= -90, "Latitude cannot be less than -90.")
    .refine((value) => !value || Number(value) <= 90, "Latitude cannot be greater than 90."),
  center_longitude: optionalNumber("Longitude")
    .refine((value) => !value || Number(value) >= -180, "Longitude cannot be less than -180.")
    .refine((value) => !value || Number(value) <= 180, "Longitude cannot be greater than 180."),
  radius_km: optionalNumber("Radius")
    .refine((value) => !value || Number(value) > 0, "Radius must be greater than 0."),
}).refine((value) => {
  const hasLatitude = Boolean(value.center_latitude.trim())
  const hasLongitude = Boolean(value.center_longitude.trim())
  return hasLatitude === hasLongitude
}, {
  message: "Latitude and longitude must be set together.",
  path: ["center_longitude"],
})

export default function AdminServiceAreasPage() {
  const { toast } = useToast()
  const { data: areas = [], isLoading } = useAdminServiceAreas()
  const updateMutation = useUpdateServiceArea()
  const [editing, setEditing] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ServiceAreaFormState>(blankForm)
  const [errors, setErrors] = useState<ServiceAreaFormErrors>({})

  function startEdit(area: (typeof areas)[0]) {
    setEditing(area.id)
    setEditForm({
      name: area.name,
      travel_fee: area.travel_fee,
      active: area.active,
      center_latitude: area.center_latitude ?? "",
      center_longitude: area.center_longitude ?? "",
      radius_km: area.radius_meters != null ? String(area.radius_meters / 1000) : "",
    })
    setErrors({})
  }

  async function saveEdit() {
    if (!editing) return

    const result = serviceAreaSchema.safeParse(editForm)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setErrors(nextErrors)
      toast({
        title: "Service area needs attention",
        description: nextErrors.base ?? "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editing,
        name: editForm.name.trim(),
        travel_fee: editForm.travel_fee.trim(),
        active: editForm.active,
        center_latitude: editForm.center_latitude.trim() || null,
        center_longitude: editForm.center_longitude.trim() || null,
        radius_meters: editForm.radius_km.trim() ? Math.round(Number(editForm.radius_km) * 1000) : null,
      })
      toast({ title: "Service area updated", description: "The service area changes were saved." })
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update this service area.")
      setErrors({ base: message })
      toast({ title: "Service area not updated", description: message, variant: "error" })
      return
    }

    setEditing(null)
  }

  function closeEditor() {
    setEditing(null)
    setEditForm(blankForm)
    setErrors({})
  }

  function set<K extends keyof ServiceAreaFormState>(key: K, value: ServiceAreaFormState[K]) {
    setEditForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-service-areas-header">
        <DashboardHeader title="Service Areas" subtitle="Configure GTA service zones and travel fees." />
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) closeEditor() }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Service area
            </p>
            <DialogTitle>Edit service area</DialogTitle>
            <DialogDescription>
              Update travel fees, visibility, and optional map metadata for this service zone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {errors.base ? (
              <div
                aria-live="polite"
                className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
              >
                {errors.base}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={errors.name} label="Name">
                <input
                  aria-invalid={Boolean(errors.name)}
                  className={fieldInputClass(errors.name)}
                  onChange={(event) => set("name", event.target.value)}
                  value={editForm.name}
                />
              </Field>
              <Field error={errors.travel_fee} label="Travel fee">
                <input
                  aria-invalid={Boolean(errors.travel_fee)}
                  className={fieldInputClass(errors.travel_fee)}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => set("travel_fee", event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={editForm.travel_fee}
                />
              </Field>
            </div>

            <div className="mt-5">
              <p className="mb-1.5 text-xs font-semibold text-[#101217]">Map metadata</p>
              <p className="mb-3 text-xs leading-5 text-[#8a8d93]">
                Latitude, longitude, and radius are stored for zone display/metadata. Booking coverage is currently controlled by configured postal codes.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field error={errors.center_latitude} label="Center latitude">
                  <input
                    aria-invalid={Boolean(errors.center_latitude)}
                    className={fieldInputClass(errors.center_latitude)}
                    inputMode="decimal"
                    onChange={(event) => set("center_latitude", event.target.value)}
                    placeholder="43.6532"
                    value={editForm.center_latitude}
                  />
                </Field>
                <Field error={errors.center_longitude} label="Center longitude">
                  <input
                    aria-invalid={Boolean(errors.center_longitude)}
                    className={fieldInputClass(errors.center_longitude)}
                    inputMode="decimal"
                    onChange={(event) => set("center_longitude", event.target.value)}
                    placeholder="-79.3832"
                    value={editForm.center_longitude}
                  />
                </Field>
                <Field error={errors.radius_km} label="Radius">
                  <input
                    aria-invalid={Boolean(errors.radius_km)}
                    className={fieldInputClass(errors.radius_km)}
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => set("radius_km", event.target.value)}
                    placeholder="25"
                    step="0.1"
                    type="number"
                    value={editForm.radius_km}
                  />
                </Field>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-[#101217]">
              <input
                checked={editForm.active}
                className="accent-[#c96c83]"
                onChange={(event) => set("active", event.target.checked)}
                type="checkbox"
              />
              Active
            </label>
          </DialogBody>
          <DialogFooter>
            <Button size="sm" disabled={updateMutation.isPending} onClick={saveEdit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading service areas...</p>
        </DashboardPanel>
      ) : areas.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No service areas found"
          description="Configured service zones will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-service-areas-list">
          {areas.map((area) => (
            <DashboardPanel key={area.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#101217]">{area.name}</span>
                    <StatusBadgeFor status={area.active ? "active" : "inactive"} />
                  </div>
                  <p className="text-xs text-[#5f6268] mt-0.5">
                    Travel fee: ${area.travel_fee}
                    {area.radius_meters != null && area.center_latitude
                      ? ` · map radius ${(area.radius_meters / 1000).toFixed(0)} km around ${Number(area.center_latitude).toFixed(3)}, ${Number(area.center_longitude).toFixed(3)}`
                      : " · no map radius set"}
                    {area.postal_code_count ? ` · ${area.postal_code_count} postal codes configured` : " · no postal-code coverage configured"}
                  </p>
                </div>
                <Button size="xs" variant="outline" onClick={() => startEdit(area)}>
                  Edit
                </Button>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      <TutorialButton steps={adminServiceAreasSteps} pageKey="admin-service-areas" />
    </DashboardPage>
  )
}

function Field({ children, className, error, label }: {
  children: React.ReactNode
  className?: string
  error?: string
  label: string
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldInputClass(error?: string) {
  return `${fieldClass} ${error ? errorInputClass : ""}`
}

function getFieldErrors(error: z.ZodError<ServiceAreaFormState>): ServiceAreaFormErrors {
  const next: ServiceAreaFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof ServiceAreaFormErrors]) {
      next[key as keyof ServiceAreaFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
