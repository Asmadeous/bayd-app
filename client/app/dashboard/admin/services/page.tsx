"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Scissors } from "lucide-react"
import { z } from "zod"

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
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { adminServicesSteps } from "@/lib/tours/admin-services-tour"

interface Service {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  active: boolean
  image_url: string | null
  simplybook_event_id: string | null
  service_category: { id: number; name: string }
  prices?: Record<string, string>
  tier_prices?: Record<string, number>
  group_size?: number
}

interface Category {
  id: number
  name: string
}

const TIER_FIELDS: { key: "kids" | "elderly" | "group"; label: string }[] = [
  { key: "kids", label: "Kids ($)" },
  { key: "elderly", label: "Elderly ($)" },
  { key: "group", label: "Group of 5 ($)" },
]

const BLANK = {
  name: "",
  description: "",
  duration_minutes: 60,
  price: "",
  active: true,
  image_url: "",
  service_category_id: "",
  simplybook_event_id: "",
  prices: { kids: "", elderly: "", group: "" } as Record<"kids" | "elderly" | "group", string>,
}

type ServiceForm = typeof BLANK
type ServiceFormErrors = Partial<Record<keyof ServiceForm | keyof ServiceForm["prices"] | "base", string>>

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "Enter a valid image URL.")

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => !value || Number(value) >= 0, `${label} cannot be negative.`)

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: z.string(),
  duration_minutes: z.coerce.number().int("Duration must be a whole number.").positive("Duration must be greater than 0."),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => Number.isFinite(Number(value)), "Price must be a number.")
    .refine((value) => Number(value) >= 0, "Price cannot be negative."),
  active: z.boolean(),
  image_url: optionalUrl,
  service_category_id: z.string().trim().min(1, "Category is required."),
  simplybook_event_id: z.string(),
  prices: z.object({
    kids: optionalMoney("Kids price"),
    elderly: optionalMoney("Elderly price"),
    group: optionalMoney("Group price"),
  }),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminServicesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)
  const [formErrors, setFormErrors] = useState<ServiceFormErrors>({})

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ data: Service[] }>("/admin/services").then((response) => response.data),
  })
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-service-categories"],
    queryFn: () => api.get<Category[]>("/admin/service_categories").then((response) => response.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post("/admin/services", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] })
      setModal(null)
      setForm(BLANK)
      setFormErrors({})
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not create this service.")
      setFormErrors({ base: message })
      toast({ title: "Service not created", description: message, variant: "error" })
    },
  })
  const updateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/services/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] })
      setModal(null)
      setFormErrors({})
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not update this service.")
      setFormErrors({ base: message })
      toast({ title: "Service not saved", description: message, variant: "error" })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
  })

  const services = servicesData?.data ?? []
  const activeCount = services.filter((service) => service.active).length

  function openEdit(service: Service) {
    const tierPrices = service.tier_prices ?? {}
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      price: service.price,
      active: service.active,
      image_url: service.image_url ?? "",
      service_category_id: String(service.service_category?.id ?? ""),
      simplybook_event_id: service.simplybook_event_id ?? "",
      prices: {
        kids: tierPrices.kids != null ? String(tierPrices.kids) : "",
        elderly: tierPrices.elderly != null ? String(tierPrices.elderly) : "",
        group: tierPrices.group != null ? String(tierPrices.group) : "",
      },
    })
    setFormErrors({})
    setModal(service.id)
  }

  function openCreate() {
    setForm(BLANK)
    setFormErrors({})
    setModal("create")
  }

  function closeEditor() {
    setFormErrors({})
    setModal(null)
  }

  function updateForm<K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    clearFieldError(key)
  }

  function updateTierPrice(key: keyof ServiceForm["prices"], value: string) {
    setForm((current) => ({
      ...current,
      prices: { ...current.prices, [key]: value },
    }))
    clearFieldError(key)
  }

  function clearFieldError(key: keyof ServiceFormErrors) {
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function saveService() {
    const result = serviceSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setFormErrors(nextErrors)
      const message = nextErrors.base ?? "Check the highlighted fields and try again."
      toast({ title: "Service form needs attention", description: message, variant: "error" })
      return
    }
    setFormErrors({})

    if (modal === "create") {
      createMutation.mutate()
    } else if (typeof modal === "number") {
      updateMutation.mutate(modal)
    }
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-services-header">
        <DashboardHeader
          actions={
            <Button
              data-tour="admin-services-add"
              onClick={openCreate}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Service
            </Button>
          }
          title="Services"
          subtitle="Manage the beauty service catalog customers can book."
        />
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) closeEditor() }}>
        <DialogContent data-tour="admin-services-editor">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Catalog editor
              </p>
              <DialogTitle className="mt-1">
                {modal === "create" ? "New Service" : "Edit Service"}
              </DialogTitle>
              <DialogDescription>
                Update service details, pricing, booking category, and catalog visibility.
              </DialogDescription>
            </div>
            <StatusBadgeFor status={form.active ? "active" : "inactive"} />
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
              <Field error={formErrors.name} label="Name">
                <input
                  aria-invalid={Boolean(formErrors.name)}
                  className={fieldClass(formErrors.name)}
                  onChange={(event) => updateForm("name", event.target.value)}
                  type="text"
                  value={form.name}
                />
              </Field>
              <Field error={formErrors.price} label="Price ($)">
                <input
                  aria-invalid={Boolean(formErrors.price)}
                  className={fieldClass(formErrors.price)}
                  min="0"
                  onChange={(event) => updateForm("price", event.target.value)}
                  step="0.01"
                  type="number"
                  value={form.price}
                />
              </Field>
              <Field error={formErrors.duration_minutes} label="Duration">
                <input
                  aria-invalid={Boolean(formErrors.duration_minutes)}
                  className={fieldClass(formErrors.duration_minutes)}
                  min="1"
                  onChange={(event) => updateForm("duration_minutes", Number(event.target.value))}
                  type="number"
                  value={form.duration_minutes}
                />
              </Field>
              <Field error={formErrors.service_category_id} label="Category">
                <Select
                  onValueChange={(value) =>
                    updateForm("service_category_id", value ?? "")
                  }
                  value={form.service_category_id}
                >
                  <SelectTrigger aria-invalid={Boolean(formErrors.service_category_id)}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field error={formErrors.image_url} label="Image URL">
                <input
                  aria-invalid={Boolean(formErrors.image_url)}
                  className={fieldClass(formErrors.image_url)}
                  onChange={(event) => updateForm("image_url", event.target.value)}
                  type="url"
                  value={form.image_url}
                />
              </Field>
              <Field label="SimplyBook Service ID">
                <input
                  className={inputClass}
                  onChange={(event) => updateForm("simplybook_event_id", event.target.value)}
                  type="text"
                  value={form.simplybook_event_id}
                />
              </Field>
              <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217] md:mt-6">
                <input
                  checked={form.active}
                  className="accent-[#c96c83]"
                  id="svc-active"
                  onChange={(event) => updateForm("active", event.target.checked)}
                  type="checkbox"
                />
                Active
              </label>
            </div>

            <div className="mt-4">
              <Field label="Description">
                <textarea
                  className="min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                  onChange={(event) => updateForm("description", event.target.value)}
                  value={form.description}
                />
              </Field>
            </div>

            <div className="mt-4">
              <p className={labelClass}>Price tiers</p>
              <div className="grid gap-4 md:grid-cols-3">
                {TIER_FIELDS.map((tier) => (
                  <Field key={tier.key} error={formErrors[tier.key]} label={tier.label}>
                    <input
                      aria-invalid={Boolean(formErrors[tier.key])}
                      className={fieldClass(formErrors[tier.key])}
                      min="0"
                      onChange={(event) => updateTierPrice(tier.key, event.target.value)}
                      placeholder={form.price || "-"}
                      step="0.01"
                      type="number"
                      value={form.prices[tier.key]}
                    />
                  </Field>
                ))}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={saveService}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : modal === "create" ? "Create" : "Save"}
            </Button>
            <Button onClick={closeEditor} size="sm" variant="ghost">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardPanel
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-tour="admin-services-stats"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Catalog</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Service Library</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#5f6268]">
          <span>{services.length} total</span>
          <span className="text-black/25">/</span>
          <span>{activeCount} active</span>
        </div>
      </DashboardPanel>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading services...</p>
        </DashboardPanel>
      ) : services.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={openCreate}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              <Plus aria-hidden="true" />
              Add Service
            </Button>
          }
          icon={Scissors}
          title="No services yet"
          description="Create the first service customers can book."
        />
      ) : (
        <div data-tour="admin-services-list">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell>Price</DataTableHeaderCell>
                <DataTableHeaderCell>Duration</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {services.map((service) => (
                <DataTableRow key={service.id}>
                  <DataTableCell className="font-bold text-[#101217]">
                    {service.name}
                    {service.description ? (
                      <span className="mt-0.5 block max-w-md truncate text-xs font-normal text-[#8a8d93]">
                        {service.description}
                      </span>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>{service.service_category?.name}</DataTableCell>
                  <DataTableCell className="font-semibold text-[#101217]">
                    ${service.price}
                    {service.tier_prices && Object.keys(service.tier_prices).length > 0 ? (
                      <span className="mt-1 block text-[11px] font-semibold text-[#8a8d93]">
                        {TIER_FIELDS.filter((tier) => service.tier_prices?.[tier.key] != null)
                          .map((tier) => `${tier.key}: $${service.tier_prices?.[tier.key]}`)
                          .join(" / ")}
                      </span>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>{service.duration_minutes} min</DataTableCell>
                  <DataTableCell>
                    <StatusBadgeFor status={service.active ? "active" : "inactive"} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEdit(service)} size="xs" variant="outline">
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={deleteMutation.isPending}
                            size="xs"
                            variant="destructive"
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete service?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove &quot;{service.name}&quot; from the service catalog. Customers
                              will no longer be able to book it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(service.id)}
                            >
                              Delete service
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

      <TutorialButton steps={adminServicesSteps} pageKey="admin-services" />
    </DashboardPage>
  )
}

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputClass} ${error ? errorInputClass : ""}`
}

function getFieldErrors(error: z.ZodError): ServiceFormErrors {
  const next: ServiceFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof ServiceFormErrors]) {
      next[key as keyof ServiceFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
