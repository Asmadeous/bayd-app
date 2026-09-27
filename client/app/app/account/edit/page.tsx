"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { ImagePicker } from "@/components/image-picker"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { AppHeader } from "../../app-header"
import { appScreenClass, cardClass, inputClass, labelClass } from "../../app-theme"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }

export default function EditAccountScreen() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { updateMe } = useAuth(APP_REDIRECT)

  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [avatar, setAvatar] = useState<File | null>(null)

  async function save() {
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar,
      })
      toast({ title: "Profile updated", variant: "success" })
      router.back()
    } catch {
      toast({ title: "Couldn't save your profile", description: "Please try again.", variant: "error" })
    }
  }

  return (
    <div className={appScreenClass}>
      <AppHeader back title="Edit profile" />
      <div className="space-y-4 px-5">
        <div className={`${cardClass} space-y-4 p-4`}>
          <div>
            <label className={labelClass}>Profile photo</label>
            <ImagePicker currentUrl={user?.avatar_url} onPick={setAvatar} label="Profile photo" shape="circle" />
          </div>
          <div>
            <label className={labelClass}>First name</label>
            <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              className={inputClass}
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="416 555 0142"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={updateMe.isPending}
          className="w-full rounded-2xl bg-[#C96C83] py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {updateMe.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}
