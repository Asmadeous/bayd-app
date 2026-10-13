"use client"

import { useState } from "react"
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
import { ServiceEditorDialog, TIER_FIELDS, type AdminService, type ServiceCategory } from "@/components/dashboard/service-editor"
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
import api from "@/lib/api"
import { adminServicesSteps } from "@/lib/tours/admin-services-tour"
import { formatMoney } from "@/lib/stores/franchise-store"

export default function AdminServicesPage() {
  const qc = useQueryClient()
  // null = closed, "create" = new service, otherwise the service being edited.
  const [editing, setEditing] = useState<"create" | AdminService | null>(null)

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ data: AdminService[] }>("/admin/services").then((response) => response.data),
  })
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["admin-service-categories"],
    queryFn: () => api.get<ServiceCategory[]>("/admin/service_categories").then((response) => response.data),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
  })

  const services = servicesData?.data ?? []
  const activeCount = services.filter((service) => service.active).length

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-services-header">
        <DashboardHeader
          actions={
            <Button
              data-tour="admin-services-add"
              onClick={() => setEditing("create")}
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

      {editing ? (
        <ServiceEditorDialog
          categories={categories}
          onClose={() => setEditing(null)}
          service={editing === "create" ? null : editing}
        />
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
              onClick={() => setEditing("create")}
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
                    {formatMoney(service.price)}
                    {service.tier_prices && Object.keys(service.tier_prices).length > 0 ? (
                      <span className="mt-1 block text-[11px] font-semibold text-[#8a8d93]">
                        {TIER_FIELDS.filter((tier) => service.tier_prices?.[tier.key] != null)
                          .map((tier) => `${tier.key}: ${formatMoney(service.tier_prices?.[tier.key])}`)
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
                      <Button onClick={() => setEditing(service)} size="xs" variant="outline">
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

