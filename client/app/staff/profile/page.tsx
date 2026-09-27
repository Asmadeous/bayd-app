"use client"

import Link from "next/link"
import { BadgeCheck, FileText, KeyRound, Lock, LogOut, Mail, MapPin, Phone, ShieldCheck } from "lucide-react"

import { useEmployeeProfile } from "@/lib/hooks/use-employee"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { DeleteAccountButton } from "@/components/account/delete-account"
import {
  ProfileChip,
  ProfileHero,
  SettingsGroup,
  SettingsRow,
  SettingsToggle,
  deleteAccountLinkClass,
} from "@/components/account/profile-ui"
import { useAppLock } from "@/components/account/use-app-lock"
import { openLegal } from "@/components/legal/legal-links"
import { staffScreenClass } from "../staff-theme"

const STAFF_REDIRECT = { afterAuth: "/staff/schedule", afterLogout: "/staff/welcome" }

// Staff profile: photo, name and title up top, then grouped settings. Editing
// (photo, title, bio) and changing the password open their own screens. Base
// location, services and availability are admin-managed, not editable here;
// past jobs, Earnings, Reviews, Shifts and Fuel live on the Manage tab.
export default function StaffProfileScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const { logout } = useAuth(STAFF_REDIRECT)
  const { data: profile, isLoading } = useEmployeeProfile()
  const appLock = useAppLock()

  const user = profile?.user
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || profile?.name || "Your profile"
  const years = profile?.years_experience
  const areaCount = profile?.service_fsas?.length ?? 0

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to see your schedule and shifts.",
      confirmLabel: "Sign out",
      tone: "danger",
    })
    if (ok) logout()
  }

  if (isLoading) {
    return (
      <div className={staffScreenClass}>
        <div className="space-y-4 px-5 pt-[calc(2rem+var(--top-inset))]">
          <div className="mx-auto size-24 animate-pulse rounded-full bg-black/5" />
          <div className="h-48 animate-pulse rounded-2xl bg-black/5" />
        </div>
      </div>
    )
  }

  return (
    <div className={staffScreenClass}>
      <div className="space-y-6 px-5 pt-[calc(2rem+var(--top-inset))]">
        <ProfileHero photoUrl={profile?.photo_url} name={name} subtitle={profile?.title} editHref="/staff/profile/edit">
          {years || areaCount ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {years ? <ProfileChip icon={BadgeCheck}>{years} yrs</ProfileChip> : null}
              {areaCount ? (
                <ProfileChip icon={MapPin}>
                  {areaCount} area{areaCount === 1 ? "" : "s"}
                </ProfileChip>
              ) : null}
            </div>
          ) : null}
        </ProfileHero>

        {profile?.bio ? (
          <p className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm leading-relaxed text-[#14100F]/80">
            {profile.bio}
          </p>
        ) : (
          <Link
            href="/staff/profile/edit"
            className="block rounded-2xl border border-dashed border-[#C96C83]/40 bg-white px-4 py-3 text-sm text-[#14100F]/70"
          >
            <span className="font-bold text-[#C96C83]">+ Add a short bio</span> clients see when they pick you.
          </Link>
        )}

        {user?.email || user?.phone ? (
          <SettingsGroup title="Contact">
            {user?.email ? <SettingsRow icon={Mail} label="Email" value={user.email} /> : null}
            {user?.phone ? <SettingsRow icon={Phone} label="Phone" value={user.phone} /> : null}
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="Security">
          <SettingsToggle
            icon={Lock}
            label="App lock"
            checked={appLock.on}
            disabled={!appLock.available || appLock.busy}
            onToggle={appLock.toggle}
          />
          <SettingsRow icon={KeyRound} label="Change password" href="/staff/profile/password" />
        </SettingsGroup>

        <SettingsGroup title="Legal">
          <SettingsRow icon={ShieldCheck} label="Privacy policy" onClick={() => void openLegal("/privacy")} />
          <SettingsRow icon={FileText} label="Terms of service" onClick={() => void openLegal("/terms")} />
        </SettingsGroup>

        {profile?.partner_name ? (
          <p className="text-center text-sm text-[#14100F]/55">Partnered with {profile.partner_name}</p>
        ) : null}

        <div>
          <SettingsGroup>
            <SettingsRow icon={LogOut} label="Sign out" onClick={handleLogout} danger />
          </SettingsGroup>
          <DeleteAccountButton
            audience="staff"
            className={`mt-3 ${deleteAccountLinkClass}`}
            onDeleted={() => {
              toast({ title: "Your account was deleted", variant: "success" })
              logout()
            }}
          />
        </div>
      </div>
    </div>
  )
}
