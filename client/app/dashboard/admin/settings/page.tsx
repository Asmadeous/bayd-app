"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface Settings {
  group_deposit_pct: string
}

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Settings>("/admin/settings").then((r) => r.data),
  })

  // Edited value overrides the fetched one; null means "showing the saved value".
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
    <div className="space-y-6">
      <DashboardHeader title="Settings" subtitle="Booking and payment configuration" />

      <div className="max-w-md rounded-xl border border-black/8 bg-white p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#5f6268] mb-1">Group booking deposit (%)</label>
          <input
            type="number" min="0" max="100" step="1"
            value={depositPct} onChange={(e) => setEdited(e.target.value)}
            className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
          />
          <p className="mt-1 text-[11px] text-[#8a8d93] leading-4">
            Percentage of the total collected upfront when a customer books a group service.
          </p>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{ background: "#c96c83", border: "none", color: "#fff" }}
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {save.isSuccess && <p className="text-xs text-green-700">Saved.</p>}
      </div>
    </div>
  )
}
