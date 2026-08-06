"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Settings {
  group_deposit_pct: string
}

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Settings>("/admin/settings").then((r) => r.data),
  })

  const [edited, setEdited] = useState<string | null>(null)
  const depositPct = edited ?? (data?.group_deposit_pct != null ? String(data.group_deposit_pct) : "")

  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", { group_deposit_pct: depositPct }).then((r) => r.data),
    onSuccess: () => {
      setEdited(null)
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
    },
  })

  return (
    <DashboardPage maxWidth="narrow">
      <DashboardHeader title="Settings" subtitle="Booking and payment configuration." />

      <DashboardPanel>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          Payments
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Group Booking Deposit</h2>

        <div className="mt-5 max-w-md">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
            Deposit percentage
          </label>
          <input
            className="h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
            max="100"
            min="0"
            onChange={(event) => setEdited(event.target.value)}
            step="1"
            type="number"
            value={depositPct}
          />
          <p className="mt-2 text-xs leading-5 text-[#5f6268]">
            Percentage of the total collected upfront when a customer books a group service.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {save.isPending ? "Saving..." : "Save"}
          </Button>
          {save.isSuccess ? <p className="text-xs font-semibold text-green-700">Saved.</p> : null}
        </div>
      </DashboardPanel>
    </DashboardPage>
  )
}
