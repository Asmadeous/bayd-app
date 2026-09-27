"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { ImagePicker } from "@/components/image-picker"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useEmployeeProfile, useUpdateProfile } from "@/lib/hooks/use-employee"
import { StaffHeader } from "../../staff-header"
import { cardClass, inputClass, labelClass, staffScreenClass } from "../../staff-theme"

// Edit the parts of the profile clients see: photo, title and bio.
export default function StaffEditProfileScreen() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: profile } = useEmployeeProfile()
  const update = useUpdateProfile()

  // null = untouched, so the fields show the saved values once they load.
  const [title, setTitle] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const titleVal = title ?? profile?.title ?? ""
  const bioVal = bio ?? profile?.bio ?? ""

  async function save() {
    try {
      await update.mutateAsync({ title: titleVal, bio: bioVal, photo })
      toast({ title: "Profile saved", variant: "success" })
      router.back()
    } catch {
      toast({ title: "Couldn't save your profile", description: "Please try again.", variant: "error" })
    }
  }

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Edit profile" />
      <div className="space-y-4 px-5">
        <div className={`${cardClass} space-y-4 p-4`}>
          <div>
            <label className={labelClass}>Profile photo</label>
            <ImagePicker currentUrl={profile?.photo_url} onPick={setPhoto} label="photo" shape="circle" />
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              value={titleVal}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nail Tech for Mississauga"
            />
          </div>
          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              className={`${inputClass} h-28`}
              value={bioVal}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short intro clients see."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="w-full rounded-2xl bg-[#C96C83] py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
