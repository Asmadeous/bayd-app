"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Gift, HandCoins, Lock, LogOut, Mail, MapPin, Phone, Star } from "lucide-react"

import { useEmployeeProfile, useUpdateProfile } from "@/lib/hooks/use-employee"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { biometricAvailable, biometricLockEnabled, setBiometricLock, verifyBiometric } from "@/lib/native/biometric"
import { hapticError, hapticSuccess } from "@/lib/native/haptics"
import { assetUrl } from "@/lib/asset-url"
import { ImagePicker } from "@/components/image-picker"
import { ChangePasswordForm } from "@/components/change-password-form"
import { staffScreenClass, cardClass, eyebrowClass, inputClass, labelClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

const STAFF_REDIRECT = { afterAuth: "/staff/schedule", afterLogout: "/staff/welcome" }

// Staff profile - a purpose-built mobile screen on useEmployeeProfile +
// useUpdateProfile (the same title/bio/photo the desktop staff profile edits;
// base location, services and availability are admin-managed, not editable here).
// Also the home for Reviews, Gift cards, and sign out.
export default function StaffProfileScreen() {
  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { logout } = useAuth(STAFF_REDIRECT)
  const { data: profile, isLoading } = useEmployeeProfile()
  const update = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState<string | null>(null)
  const [bio, setBio] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)

  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioOn, setBioOn] = useState(() => biometricLockEnabled())
  const [bioBusy, setBioBusy] = useState(false)

  useEffect(() => {
    biometricAvailable().then(setBioAvailable)
  }, [])

  const user = profile?.user
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Your profile"
  const titleVal = title ?? profile?.title ?? ""
  const bioVal = bio ?? profile?.bio ?? ""

  const years = profile?.years_experience
  const areaCount = profile?.service_fsas?.length ?? 0
  const details = [
    years ? { icon: BadgeCheck, label: "Experience", value: `${years} years` } : null,
    areaCount ? { icon: MapPin, label: "Coverage", value: `${areaCount} service area${areaCount === 1 ? "" : "s"}` } : null,
    user?.phone ? { icon: Phone, label: "Phone", value: user.phone } : null,
    user?.email ? { icon: Mail, label: "Email", value: user.email } : null,
  ].filter((d): d is { icon: typeof BadgeCheck; label: string; value: string } => d !== null)

  async function save() {
    try {
      await update.mutateAsync({ title: titleVal, bio: bioVal, photo })
      setEditing(false)
      setPhoto(null)
      setTitle(null)
      setBio(null)
      toast({ title: "Profile saved", variant: "success" })
    } catch {
      toast({ title: "Couldn't save your profile", description: "Please try again.", variant: "error" })
    }
  }

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to see your schedule and shifts.",
      confirmLabel: "Sign out",
      tone: "danger",
    })
    if (ok) logout()
  }

  // Toggle the biometric app-lock. Turning it on requires passing the device
  // biometric once (proving it works); turning it off just clears the flag.
  async function toggleBiometric() {
    setBioBusy(true)
    try {
      if (bioOn) {
        setBiometricLock(false)
        setBioOn(false)
        toast({ title: "App lock turned off", variant: "warning" })
      } else {
        const ok = await verifyBiometric("Enable app lock")
        if (ok) {
          setBiometricLock(true)
          setBioOn(true)
          hapticSuccess()
          toast({
            title: "App lock on",
            description: "You'll unlock with your fingerprint or face.",
            variant: "success",
          })
        } else {
          hapticError()
          toast({ title: "Couldn't verify", description: "App lock not enabled.", variant: "error" })
        }
      }
    } finally {
      setBioBusy(false)
    }
  }

  return (
    <div className={staffScreenClass}>
      <StaffHeader
        title="Profile"
        action={
          !editing && !isLoading ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-bold text-[#14100F]">
              Edit
            </button>
          ) : undefined
        }
      />

      <div className="space-y-5 px-5">
        {/* Identity card */}
        <section className="rounded-2xl bg-[#14100F] p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
              {profile?.photo_url ? (
                <span
                  className="size-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${assetUrl(profile.photo_url)})` }}
                  aria-hidden
                />
              ) : (
                <span className="text-lg font-black">{(user?.first_name ?? "T").charAt(0)}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{fullName}</p>
              <p className="truncate text-sm text-white/55">{profile?.title || user?.email}</p>
            </div>
          </div>
        </section>

        {/* Edit form */}
        {editing ? (
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
                className={`${inputClass} h-24`}
                value={bioVal}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short intro clients see."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={update.isPending}
                className="flex-1 rounded-xl bg-[#C96C83] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {update.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setPhoto(null)
                  setTitle(null)
                  setBio(null)
                }}
                className="flex-1 rounded-xl border border-black/10 bg-white py-3 text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>About</p>
            <p className={`mt-1.5 text-sm ${bioVal ? "text-[#14100F]" : mutedClass}`}>
              {bioVal || "No bio yet. Tap Edit to add one."}
            </p>
          </div>
        )}

        {/* Details - the real employee record (coverage, experience, contact).
            Services and availability are admin-managed, shown read-only. */}
        {!editing && details.length > 0 && (
          <section className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>Details</p>
            <dl className="mt-2 divide-y divide-black/[0.06]">
              {details.map((d) => (
                <div key={d.label} className="flex items-center gap-3 py-2.5">
                  <d.icon className="size-4 shrink-0 text-[#C96C83]" aria-hidden />
                  <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-[0.06em] text-[#14100F]/45">
                    {d.label}
                  </dt>
                  <dd className="min-w-0 flex-1 truncate text-sm font-medium text-[#14100F]">{d.value}</dd>
                </div>
              ))}
            </dl>
            {profile?.partner_name && (
              <p className={`mt-3 border-t border-black/[0.06] pt-3 text-xs ${mutedClass}`}>
                Partnered with {profile.partner_name}
              </p>
            )}
          </section>
        )}

        {/* More - surfaces that aren't bottom-nav tabs. */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <MenuRow href="/staff/earnings" icon={HandCoins} label="Earnings" />
          <MenuRow href="/staff/reviews" icon={Star} label="Reviews" />
          <MenuRow href="/staff/gift-cards" icon={Gift} label="Gift cards" last />
        </section>

        {/* Security - optional biometric app-lock (native devices only). */}
        {bioAvailable && (
          <section className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>Security</p>
            <p className={`mb-3 mt-1 text-sm ${mutedClass}`}>
              Lock the app with your fingerprint, face, or device PIN.
            </p>
            <button
              type="button"
              onClick={toggleBiometric}
              disabled={bioBusy}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 ${
                bioOn ? "bg-[#14100F] text-white" : "border border-black/15 text-[#14100F]"
              }`}
            >
              <Lock className="size-4" aria-hidden />
              {bioBusy ? "Follow your device…" : bioOn ? "App lock is on - tap to turn off" : "Enable app lock"}
            </button>
          </section>
        )}

        {/* Change password - staff have a password login (customers are OTP). */}
        <section className={`${cardClass} p-4`}>
          <p className={eyebrowClass}>Change password</p>
          <p className={`mb-3 mt-1 text-sm ${mutedClass}`}>
            Enter your current password and choose a new one. You&apos;ll stay signed in.
          </p>
          <ChangePasswordForm />
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#8f3f4b]/25 bg-white py-3.5 text-sm font-bold text-[#8f3f4b]"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  )

  function MenuRow({
    href,
    icon: Icon,
    label,
    last,
  }: {
    href: string
    icon: typeof Star
    label: string
    last?: boolean
  }) {
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? "" : "border-b border-black/[0.06]"}`}
      >
        <Icon className="size-5 text-[#C96C83]" aria-hidden />
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <span className="text-[#14100F]/30">›</span>
      </button>
    )
  }
}
