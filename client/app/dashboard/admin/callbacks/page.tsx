"use client"

import { useEffect } from "react"
import { Phone } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useToast } from "@/components/bayd-toast-provider"
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
import { adminCallbacksSteps } from "@/lib/tours/admin-callbacks-tour"

interface CallbackRequest {
  id: number
  postal_code: string | null
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
  status: string
  created_at: string
  user?: { email: string; first_name: string | null; last_name: string | null; phone: string | null }
  service?: { name: string }
}

const STATUSES = ["new", "contacted", "booked", "declined"]

export default function AdminCallbacksPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery<{ data: CallbackRequest[] }>({
    queryKey: ["admin-callbacks"],
    queryFn: () => api.get<{ data: CallbackRequest[] }>("/admin/callback_requests").then((r) => r.data),
  })
  const rows = data?.data ?? []

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/callback_requests/${id}`, { callback_request: { status } }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-callbacks"] })
      toast({ title: "Callback status saved", variant: "success" })
    },
    onError: (error: unknown) => {
      toast({
        title: "Callback status not saved",
        description: getApiErrorMessage(error, "Could not update this callback request."),
        variant: "error",
      })
    },
  })

  useEffect(() => {
    if (isError) {
      toast({
        title: "Callbacks not loaded",
        description: "Could not load callback requests.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="callbacks-header">
        <DashboardHeader
          title="Callbacks"
          subtitle="Customers outside dispatch coverage who need a follow-up call."
        />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading callback requests...</p>
        </DashboardPanel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No callback requests"
          description="Out-of-area customer requests will appear here for follow-up."
        />
      ) : (
        <div className="space-y-3" data-tour="callbacks-list">
          {rows.map((request) => {
            const name =
              request.contact_name ||
              (request.user &&
                [request.user.first_name, request.user.last_name].filter(Boolean).join(" ")) ||
              request.user?.email ||
              "Customer"
            const phone = request.contact_phone || request.user?.phone

            return (
              <DashboardPanel className="p-0" key={request.id}>
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-[#101217]">{name}</h2>
                      <StatusBadgeFor status={request.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                      {request.postal_code ?? "-"}
                      {phone ? ` / ${phone}` : " / no phone"}
                      {request.service ? ` / ${request.service.name}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <Select
                      disabled={update.isPending}
                      onValueChange={(value) =>
                        update.mutate({ id: request.id, status: value ?? request.status })
                      }
                      value={request.status}
                    >
                      <SelectTrigger className="h-9 w-32 text-xs capitalize">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem className="capitalize" key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {phone ? (
                      <a href={`tel:${phone}`}>
                        <Button size="xs" variant="outline">
                          <Phone aria-hidden="true" className="size-3.5" />
                          Call
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              </DashboardPanel>
            )
          })}
        </div>
      )}

      <TutorialButton steps={adminCallbacksSteps} pageKey="admin-callbacks" />
    </DashboardPage>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
