"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { CheckCircle2, ImagePlus, Mail, Sparkles, UserRound } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useEmployeeProfile, useUpdateProfile } from "@/lib/hooks/use-employee"
import { employeeProfileSteps } from "@/lib/tours/employee-tour"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function EmployeeProfilePage() {
  const { data: profile, isLoading } = useEmployeeProfile()
  const updateMutation = useUpdateProfile()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoPreviewObjectUrlRef = useRef<string | null>(null)
  const [form, setForm] = useState<{ title?: string; bio?: string; photo_url?: string }>({})
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const title = form.title ?? profile?.title ?? ""
  const bio = form.bio ?? profile?.bio ?? ""
  const photoUrl = form.photo_url ?? profile?.photo_url ?? ""
  const displayPhotoUrl = selectedPhotoPreviewUrl ?? photoUrl
  const employeeName = [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ")

  useEffect(() => {
    return () => {
      if (photoPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(photoPreviewObjectUrlRef.current)
      }
    }
  }, [])

  function handlePhotoChange(file: File | undefined) {
    if (!file) return

    if (photoPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(photoPreviewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    photoPreviewObjectUrlRef.current = objectUrl
    setSelectedPhotoFile(file)
    setSelectedPhotoPreviewUrl(objectUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateMutation.mutateAsync({ title, bio, photo_url: photoUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return (
      <DashboardPage>
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading profile...</p>
        </DashboardPanel>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="profile-header">
        <DashboardHeader title="Profile" subtitle="Update the professional profile clients see." />
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <DashboardPanel data-tour="profile-card" className="space-y-5">
          <div className="mx-auto grid size-28 place-items-center overflow-hidden border border-black/10 bg-[#f4f1eb] text-[#5f6268]">
            {displayPhotoUrl ? (
              <Image
                alt="Profile"
                className="size-full object-cover"
                height={112}
                src={displayPhotoUrl}
                unoptimized
                width={112}
              />
            ) : (
              <UserRound aria-hidden="true" className="size-9" />
            )}
          </div>
          <div className="text-center">
            <p className="text-base font-extrabold text-[#101217]">{employeeName || "Profile"}</p>
            <p className="mt-1 text-xs font-semibold text-[#5f6268]">{profile?.user?.email}</p>
          </div>
          <div className="flex justify-center">
            <StatusBadgeFor status={profile?.on_shift ? "on_shift" : "off_shift"} />
          </div>
          <div className="space-y-3 border-t border-black/8 pt-5">
            <div className="flex items-center gap-2 text-sm text-[#5f6268]">
              <Mail aria-hidden="true" className="size-4 text-[#c96c83]" />
              <span className="min-w-0 truncate">{profile?.user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#5f6268]">
              <Sparkles aria-hidden="true" className="size-4 text-[#c96c83]" />
              <span className="min-w-0 truncate">{title || "Beauty professional"}</span>
            </div>
          </div>
          {profile?.years_experience ? (
            <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
              {profile.years_experience} years experience
            </p>
          ) : null}
        </DashboardPanel>

        <DashboardPanel data-tour="profile-form">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button
                aria-label="Choose profile photo"
                className="group relative size-28 shrink-0 overflow-hidden border border-black/15 bg-white text-[#5f6268] outline-none transition-all hover:border-[#c96c83] hover:text-[#c96c83] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onClick={() => photoInputRef.current?.click()}
                type="button"
              >
                {displayPhotoUrl ? (
                  <Image
                    alt="Selected professional profile preview"
                    className="object-cover"
                    fill
                    sizes="112px"
                    src={displayPhotoUrl}
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
                <p className="text-base font-extrabold text-[#101217]">Professional photo</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f6268]">
                  Choose a polished beauty profile image that helps clients feel confident before
                  they book with you.
                </p>
                {selectedPhotoFile ? (
                  <p className="mt-3 truncate text-xs font-bold uppercase tracking-[0.14em] text-[#a36f4d]">
                    {selectedPhotoFile.name}
                  </p>
                ) : null}
              </div>

              <input
                ref={photoInputRef}
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
              />
            </div>

            <div>
              <label className={labelClass}>Professional Title</label>
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Senior Nail Technician"
                value={title}
              />
            </div>
            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                className={cn(
                  fieldClass,
                  "min-h-28 resize-none py-3 leading-6",
                )}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Tell clients about yourself..."
                value={bio}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={updateMutation.isPending}
                type="submit"
                style={{ background: "#c96c83", border: "none", color: "#fff" }}
              >
                {updateMutation.isPending ? "Saving..." : "Save Profile"}
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
      </div>

      <TutorialButton
        steps={employeeProfileSteps}
        pageKey="employee-profile"
      />
    </DashboardPage>
  )
}
