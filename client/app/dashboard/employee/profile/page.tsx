"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useEmployeeProfile, useUpdateProfile } from "@/lib/hooks/use-employee"

export default function EmployeeProfilePage() {
  const { data: profile, isLoading } = useEmployeeProfile()
  const updateMutation = useUpdateProfile()
  const [form, setForm] = useState({ title: "", bio: "", photo_url: "" })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({ title: profile.title ?? "", bio: profile.bio ?? "", photo_url: profile.photo_url ?? "" })
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateMutation.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) return <div className="text-sm text-[#5f6268]">Loading…</div>

  return (
    <div className="space-y-6">
      <DashboardHeader title="My Profile" subtitle="Update your professional profile" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="rounded-xl border border-black/8 bg-white p-6 text-center">
          <div className="mx-auto size-20 rounded-full overflow-hidden bg-black/8 mb-3">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="size-full object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center text-2xl font-bold text-[#5f6268]">
                {profile?.user?.first_name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <p className="font-semibold text-[#101217]">
            {[profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ")}
          </p>
          <p className="text-xs text-[#5f6268] mt-0.5">{profile?.user?.email}</p>
          {profile?.years_experience && (
            <p className="text-xs mt-2 text-[#a36f4d] font-medium">{profile.years_experience} years experience</p>
          )}
          <div className="mt-3">
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={
                profile?.on_shift
                  ? { background: "#5a9e5a22", color: "#5a9e5a" }
                  : { background: "#8a8d9322", color: "#8a8d93" }
              }
            >
              {profile?.on_shift ? "On Shift" : "Off Shift"}
            </span>
          </div>
        </div>

        {/* Edit form */}
        <div className="md:col-span-2 rounded-xl border border-black/8 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo URL with live preview */}
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Profile photo URL</label>
              <div className="flex gap-3 items-center">
                <div className="size-12 rounded-full overflow-hidden bg-black/8 shrink-0 flex items-center justify-center">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Preview" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  ) : (
                    <span className="text-lg font-bold text-[#5f6268]">{(profile?.user?.first_name?.[0] ?? "?").toUpperCase()}</span>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.photo_url}
                  onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                  className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Professional Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Senior Nail Technician"
                className="w-full h-10 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                placeholder="Tell clients about yourself…"
                className="w-full border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                style={{ background: "#c96c83", border: "none", color: "#fff" }}
              >
                {updateMutation.isPending ? "Saving…" : "Save Profile"}
              </Button>
              {saved && <span className="text-sm text-[#5a9e5a] font-medium">Saved!</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
