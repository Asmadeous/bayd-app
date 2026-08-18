"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { adminSettingsSteps } from "@/lib/tours/admin-settings-tour"

interface Settings {
  group_deposit_pct: string
}

const fieldClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

function AdminProfilePanel() {
  const { user } = useAuthStore()
  const { updateMe } = useAuth()
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
  })
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateMe.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardPanel data-tour="admin-settings-profile">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Account</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#101217]">My Profile</h2>

      <form className="mt-5 max-w-md space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name</label>
            <input
              className={fieldClass}
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              className={fieldClass}
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            className={fieldClass}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            className={`${fieldClass} cursor-not-allowed bg-[#f4f1eb] text-[#5f6268]`}
            readOnly
            value={user?.email ?? ""}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            disabled={updateMe.isPending}
            type="submit"
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {updateMe.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5a9e5a]">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Saved
            </span>
          ) : null}
        </div>
      </form>
    </DashboardPanel>
  )
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
      <div data-tour="admin-settings-header">
        <DashboardHeader title="Settings" subtitle="Your profile, plus booking and payment configuration." />
      </div>

      <AdminProfilePanel />

      <DashboardPanel data-tour="admin-settings-deposit">
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

      <TutorialButton steps={adminSettingsSteps} pageKey="admin-settings" />
    </DashboardPage>
  )
}
