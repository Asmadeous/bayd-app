"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, Plus } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Address {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string
  is_default: boolean
}

const blankAddress = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  province: "ON",
  postal_code: "",
}

const fieldClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function CustomerAddressesPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blankAddress)

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<Address[]>("/addresses").then((response) => response.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Address>("/addresses", { address: form }).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] })
      setAdding(false)
      setForm(blankAddress)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  })

  const defaultMutation = useMutation({
    mutationFn: (id: number) => api.post(`/addresses/${id}/set_default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  })

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        actions={
          <Button
            onClick={() => setAdding((value) => !value)}
            size="sm"
            style={adding ? undefined : { background: "#c96c83", border: "none", color: "#fff" }}
            variant={adding ? "outline" : "default"}
          >
            {!adding ? <Plus aria-hidden="true" className="size-4" /> : null}
            {adding ? "Cancel" : "Add Address"}
          </Button>
        }
        title="Addresses"
        subtitle="Manage service locations for mobile beauty appointments."
      />

      {adding ? (
        <DashboardPanel>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Service location
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#101217]">New Address</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["label", "line1", "line2", "city", "province", "postal_code"] as const).map((field) => (
              <div className={field === "line1" ? "sm:col-span-2" : ""} key={field}>
                <label className={labelClass}>{field.replace("_", " ")}</label>
                <input
                  className={fieldClass}
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button
              disabled={createMutation.isPending || !form.line1 || !form.city}
              onClick={() => createMutation.mutate()}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              Save Address
            </Button>
          </div>
        </DashboardPanel>
      ) : null}

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading addresses...</p>
        </DashboardPanel>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Add a service address to make checkout and booking faster."
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <DashboardPanel className="p-0" key={address.id}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-[#101217]">
                      {address.label ?? address.line1}
                    </h2>
                    {address.is_default ? <StatusBadgeFor status="default" /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                    {address.province} {address.postal_code}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!address.is_default ? (
                    <Button
                      onClick={() => defaultMutation.mutate(address.id)}
                      size="xs"
                      variant="outline"
                    >
                      Set Default
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => deleteMutation.mutate(address.id)}
                    size="xs"
                    variant="destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}
    </DashboardPage>
  )
}
