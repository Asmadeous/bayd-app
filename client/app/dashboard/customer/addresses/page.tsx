"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

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

export default function CustomerAddressesPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: "", line1: "", line2: "", city: "", province: "ON", postal_code: "" })

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<Address[]>("/addresses").then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Address>("/addresses", { address: form }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); setAdding(false); setForm({ label: "", line1: "", line2: "", city: "", province: "ON", postal_code: "" }) },
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
    <div className="space-y-6">
      <DashboardHeader
        title="My Addresses"
        subtitle="Service locations for your bookings"
        actions={
          <Button
            size="sm"
            onClick={() => setAdding((v) => !v)}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {adding ? "Cancel" : "+ Add Address"}
          </Button>
        }
      />

      {adding && (
        <div className="rounded-xl border border-black/8 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-sm text-[#101217]">New Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["label", "line1", "line2", "city", "province", "postal_code"] as const).map((field) => (
              <div key={field} className={field === "line1" ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-[#5f6268] mb-1 capitalize">
                  {field.replace("_", " ")}
                </label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                />
              </div>
            ))}
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.line1 || !form.city}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            Save Address
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No addresses yet.
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#101217]">
                    {addr.label ?? addr.line1}
                  </span>
                  {addr.is_default && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#c96c8322", color: "#c96c83" }}>
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5f6268] mt-0.5">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.province} {addr.postal_code}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!addr.is_default && (
                  <Button variant="ghost" size="xs" onClick={() => defaultMutation.mutate(addr.id)}>
                    Set Default
                  </Button>
                )}
                <Button variant="destructive" size="xs" onClick={() => deleteMutation.mutate(addr.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
