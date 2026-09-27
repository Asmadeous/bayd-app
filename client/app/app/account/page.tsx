"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, ChevronRight, Lock, LogOut, Mail, MapPin, Repeat2, User } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import {
  biometricAvailable,
  biometricLockEnabled,
  setBiometricLock,
  verifyBiometric,
} from "@/lib/native/biometric"
import { hapticSuccess, hapticError } from "@/lib/native/haptics"
import { DeleteAccountButton } from "@/components/account/delete-account"
import { LegalLinks } from "@/components/legal/legal-links"
import { ToggleRow } from "@/components/toggle-row"
import { ImagePicker } from "@/components/image-picker"
import { appScreenClass } from "../app-theme"
import { AppHeader } from "../app-header"
import { assetUrl } from "@/lib/asset-url"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }

export default function AccountScreen() {
  const { user } = useAuthStore()
  const { logout, updateMe } = useAuth(APP_REDIRECT)
  const { toast } = useToast()
  const confirm = useConfirm()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")

  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioOn, setBioOn] = useState(() => biometricLockEnabled())
  const [bioBusy, setBioBusy] = useState(false)

  useEffect(() => {
    biometricAvailable().then(setBioAvailable)
  }, [])

  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Your account"

  async function save() {
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar: avatarFile,
      })
      setAvatarFile(null)
      setEditing(false)
      toast({ title: "Profile updated", variant: "success" })
    } catch {
      toast({ title: "Couldn't save your profile", description: "Please try again.", variant: "error" })
    }
  }

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to book and manage appointments.",
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
    <div className={appScreenClass}>
      <AppHeader
        title="Profile"
        action={
          !editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-bold text-[#14100F]">
              Edit
            </button>
          ) : undefined
        }
      />

      <div className="space-y-5 px-5">
        <section className="rounded-2xl bg-[#101217] p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
              {user?.avatar_url ? (
                <span
                  className="size-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${assetUrl(user.avatar_url)})` }}
                  aria-hidden
                />
              ) : (
                <User className="size-6 text-white/70" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold">{fullName}</p>
              <p className="truncate text-sm text-white/55">{user?.email}</p>
              <p className="truncate text-sm text-white/55">{user?.phone || "No phone on file"}</p>
            </div>
          </div>
        </section>

        {editing ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <ImagePicker
                currentUrl={user?.avatar_url}
                onPick={setAvatarFile}
                label="Profile photo"
                shape="circle"
              />
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-4 py-3 text-base"
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-4 py-3 text-base"
              />
              <input
                placeholder="Phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-base"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={updateMe.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#c96c83] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Check className="size-4" aria-hidden />
                  {updateMe.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <ToggleRow
            icon={Lock}
            label="App lock"
            checked={bioOn}
            disabled={!bioAvailable || bioBusy}
            onToggle={toggleBiometric}
          />
          <MenuRow href="/app/subscriptions" icon={Repeat2} label="Subscriptions" />
          <MenuRow href="/app/addresses" icon={MapPin} label="Addresses" last />
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-[#8f3f4b] shadow-sm"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>

        <DeleteAccountButton
          onDeleted={() => {
            toast({ title: "Your account was deleted", variant: "success" })
            logout()
          }}
        />

        <LegalLinks className="text-[#101217]/55" />
      </div>
    </div>
  )
}

function MenuRow({
  href,
  icon: Icon,
  label,
  last,
}: {
  href: string
  icon: typeof Mail
  label: string
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-black/5"}`}
    >
      <Icon className="size-5 text-[#c96c83]" aria-hidden />
      <span className="flex-1 text-sm font-semibold text-[#101217]">{label}</span>
      <ChevronRight className="size-4 text-[#101217]/30" aria-hidden />
    </Link>
  )
}
