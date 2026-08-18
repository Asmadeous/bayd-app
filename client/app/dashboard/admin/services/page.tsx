"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Scissors } from "lucide-react"

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
import { Button } from "@/components/ui/button"
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

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminServicesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<"create" | number | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)

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
    },
  })
  const updateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/services/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] })
      setModal(null)
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
    setModal(service.id)
  }

  function openCreate() {
    setForm(BLANK)
    setModal("create")
  }

  function saveService() {
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

      {modal !== null ? (
        <DashboardPanel data-tour="admin-services-editor">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Catalog editor
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#101217]">
                {modal === "create" ? "New Service" : "Edit Service"}
              </h2>
            </div>
            <StatusBadgeFor status={form.active ? "active" : "inactive"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Name">
              <input
                className={inputClass}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                type="text"
                value={form.name}
              />
            </Field>
            <Field label="Price ($)">
              <input
                className={inputClass}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                type="number"
                value={form.price}
              />
            </Field>
            <Field label="Duration">
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    duration_minutes: Number(event.target.value),
                  }))
                }
                type="number"
                value={form.duration_minutes}
              />
            </Field>
            <Field label="Category">
              <Select
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, service_category_id: value ?? "" }))
                }
                value={form.service_category_id}
              >
                <SelectTrigger>
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
            <Field label="Image URL">
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((current) => ({ ...current, image_url: event.target.value }))
                }
                type="url"
                value={form.image_url}
              />
            </Field>
            <Field label="SimplyBook Service ID">
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((current) => ({ ...current, simplybook_event_id: event.target.value }))
                }
                type="text"
                value={form.simplybook_event_id}
              />
            </Field>
            <label className="flex min-h-10 items-center gap-2 border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold text-[#101217] md:mt-6">
              <input
                checked={form.active}
                className="accent-[#c96c83]"
                id="svc-active"
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
                type="checkbox"
              />
              Active
            </label>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <textarea
                className="min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className={labelClass}>Price tiers</p>
            <div className="grid gap-4 md:grid-cols-3">
              {TIER_FIELDS.map((tier) => (
                <Field key={tier.key} label={tier.label}>
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        prices: { ...current.prices, [tier.key]: event.target.value },
                      }))
                    }
                    placeholder={form.price || "-"}
                    step="0.01"
                    type="number"
                    value={form.prices[tier.key]}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={saveService}
              size="sm"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {modal === "create" ? "Create" : "Save"}
            </Button>
            <Button onClick={() => setModal(null)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </DashboardPanel>
      ) : null}

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
                      <Button
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete "${service.name}"?`)) deleteMutation.mutate(service.id)
                        }}
                        size="xs"
                        variant="destructive"
                      >
                        Delete
                      </Button>
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}
