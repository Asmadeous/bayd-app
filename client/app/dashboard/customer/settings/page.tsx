"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { CheckCircle2, ImagePlus, Mail, UserRound } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { CardOnFile } from "@/components/dashboard/card-on-file"
import { PasskeyManager } from "@/components/dashboard/passkey-manager"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { customerSettingsSteps } from "@/lib/tours/customer-settings-tour"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function CustomerSettingsPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { updateMe } = useAuth()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarPreviewObjectUrlRef = useRef<string | null>(null)
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    avatar_url: user?.avatar_url ?? "",
    marketing_opt_in: user?.marketing_opt_in ?? false,
  })
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(user?.avatar_url ?? null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    return () => {
      if (avatarPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewObjectUrlRef.current)
      }
    }
  }, [])

  function handleAvatarChange(file: File | undefined) {
    if (!file) return

    if (avatarPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    avatarPreviewObjectUrlRef.current = objectUrl
    setSelectedAvatarFile(file)
    setAvatarPreviewUrl(objectUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateMe.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        marketing_opt_in: form.marketing_opt_in,
        avatar: selectedAvatarFile,
      })
      setSaved(true)
      toast({ title: "Settings saved", variant: "success" })
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      toast({
        title: "Settings not saved",
        description: getApiErrorMessage(error, "Could not save your account settings."),
        variant: "error",
      })
    }
  }

  return (
    <DashboardPage>
      <div data-tour="customer-settings-header">
        <DashboardHeader
          title="Account Settings"
          subtitle="Keep your profile, contact details, and booking preferences current."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DashboardPanel data-tour="customer-settings-form">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button
                aria-label="Choose profile photo"
                className="group relative size-28 shrink-0 overflow-hidden border border-black/15 bg-white text-[#5f6268] outline-none transition-all hover:border-[#c96c83] hover:text-[#c96c83] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                data-tour="customer-settings-avatar"
                onClick={() => avatarInputRef.current?.click()}
                type="button"
              >
                {avatarPreviewUrl ? (
                  <Image
                    alt="Selected profile preview"
                    className="object-cover"
                    fill
                    sizes="112px"
                    src={avatarPreviewUrl}
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2">
                    <ImagePlus aria-hidden="true" className="size-8" />
                    <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em]">
                      Photo
                    </span>
                  </span>
                )}
              </button>

              <div className="min-w-0 pt-1">
                <p className="text-base font-extrabold text-[#101217]">Profile photo</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f6268]">
                  Choose a polished beauty photo that makes your B.A.Y.D profile feel personal
                  before every appointment.
                </p>
                {selectedAvatarFile ? (
                  <p className="mt-3 truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                    {selectedAvatarFile.name}
                  </p>
                ) : null}
                {selectedAvatarFile ? (
                  <p className="mt-2 max-w-xl text-xs font-semibold text-[#8a8d93]">
                    This photo will be uploaded when you save your settings.
                  </p>
                ) : null}
              </div>

              <input
                ref={avatarInputRef}
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(event) => handleAvatarChange(event.target.files?.[0])}
              />
            </div>

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
                className={cn(fieldClass, "cursor-not-allowed bg-[#f4f1eb] text-[#5f6268]")}
                readOnly
                value={user?.email ?? ""}
              />
            </div>

            <label className="flex cursor-pointer select-none items-start gap-3 border border-black/10 bg-[#fbfaf7] p-4">
              <input
                checked={form.marketing_opt_in}
                className="mt-1 size-4 accent-[#c96c83]"
                type="checkbox"
                onChange={(e) => setForm((f) => ({ ...f, marketing_opt_in: e.target.checked }))}
              />
              <span>
                <span className="block text-sm font-extrabold text-[#101217]">
                  Beauty notes and offers
                </span>
                <span className="mt-1 block text-sm leading-6 text-[#5f6268]">
                  Receive appointment inspiration, seasonal services, and client-only offers.
                </span>
              </span>
            </label>

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

        <div className="space-y-6">
          <DashboardPanel className="space-y-4" data-tour="customer-settings-summary">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center border border-black/10 bg-[#f4f1eb] text-[#c96c83]">
                <UserRound aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[#101217]">
                  {[form.first_name, form.last_name].filter(Boolean).join(" ") || "Your profile"}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#5f6268]">Customer account</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-black/8 pt-4 text-sm text-[#5f6268]">
              <Mail aria-hidden="true" className="size-4 text-[#c96c83]" />
              <span className="min-w-0 truncate">{user?.email}</span>
            </div>
          </DashboardPanel>

          <PasskeyManager />

          <div data-tour="customer-settings-card-on-file">
            <CardOnFile />
          </div>
        </div>
      </div>

      <TutorialButton steps={customerSettingsSteps} pageKey="customer-settings" />
    </DashboardPage>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
