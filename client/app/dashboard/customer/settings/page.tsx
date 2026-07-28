"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CardOnFile } from "@/components/dashboard/card-on-file"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function CustomerSettingsPage() {
  const { user } = useAuthStore()
  const { updateMe } = useAuth()
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    avatar_url: user?.avatar_url ?? "",
    marketing_opt_in: user?.marketing_opt_in ?? false,
  })
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateMe.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Account Settings" subtitle="Update your profile information" />

      <div className="rounded-xl border border-black/8 bg-white p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div>
            <label className="block text-xs font-medium text-[#5f6268] mb-1">Profile photo URL</label>
            <div className="flex gap-3 items-center">
              <div className="size-12 rounded-full overflow-hidden bg-black/8 shrink-0 flex items-center justify-center">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  <span className="text-lg font-bold text-[#5f6268]">{(user?.first_name?.[0] ?? "?").toUpperCase()}</span>
                )}
              </div>
              <input
                type="url"
                placeholder="https://…"
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">First name</label>
              <input
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Last name</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5f6268] mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5f6268] mb-1">Email (read-only)</label>
            <input
              value={user?.email ?? ""}
              readOnly
              className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#5f6268] bg-black/2 cursor-not-allowed"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.marketing_opt_in}
              onChange={(e) => setForm((f) => ({ ...f, marketing_opt_in: e.target.checked }))}
              className="rounded border-black/20 accent-[#c96c83]"
            />
            <span className="text-sm text-[#101217]">Receive marketing emails & offers</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={updateMe.isPending}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {updateMe.isPending ? "Saving…" : "Save Changes"}
            </Button>
            {saved && <span className="text-sm text-[#5a9e5a] font-medium">Saved!</span>}
          </div>
        </form>
      </div>

      <CardOnFile />
    </div>
  )
}
