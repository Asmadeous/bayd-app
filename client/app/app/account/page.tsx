"use client"

import { FileText, Lock, LogOut, Mail, MapPin, Phone, Repeat2, ShieldCheck } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { DeleteAccountButton } from "@/components/account/delete-account"
import {
  ProfileHero,
  SettingsGroup,
  SettingsRow,
  SettingsToggle,
  deleteAccountLinkClass,
} from "@/components/account/profile-ui"
import { useAppLock } from "@/components/account/use-app-lock"
import { openLegal } from "@/components/legal/legal-links"
import { appScreenClass } from "../app-theme"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }

// Customer profile: photo and name up top, then grouped settings. Editing the
// photo, name and phone opens its own screen.
export default function AccountScreen() {
  const { user } = useAuthStore()
  const { logout } = useAuth(APP_REDIRECT)
  const { toast } = useToast()
  const confirm = useConfirm()
  const appLock = useAppLock()

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Your account"
  const since = user?.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}`
    : null

  async function handleLogout() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to book and manage appointments.",
      confirmLabel: "Sign out",
      tone: "danger",
    })
    if (ok) logout()
  }

  return (
    <div className={appScreenClass}>
      <div className="space-y-6 px-5 pt-[calc(2rem+var(--top-inset))]">
        <ProfileHero photoUrl={user?.avatar_url} name={name} subtitle={since} editHref="/app/account/edit" />

        <SettingsGroup title="Account">
          <SettingsRow icon={Mail} label="Email" value={user?.email} />
          <SettingsRow icon={Phone} label="Phone" value={user?.phone || "Add"} href={user?.phone ? undefined : "/app/account/edit"} />
          <SettingsRow icon={MapPin} label="Addresses" href="/app/addresses" />
          <SettingsRow icon={Repeat2} label="Subscriptions" href="/app/subscriptions" />
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsToggle
            icon={Lock}
            label="App lock"
            checked={appLock.on}
            disabled={!appLock.available || appLock.busy}
            onToggle={appLock.toggle}
          />
        </SettingsGroup>

        <SettingsGroup title="Legal">
          <SettingsRow icon={ShieldCheck} label="Privacy policy" onClick={() => void openLegal("/privacy")} />
          <SettingsRow icon={FileText} label="Terms of service" onClick={() => void openLegal("/terms")} />
        </SettingsGroup>

        <div>
          <SettingsGroup>
            <SettingsRow icon={LogOut} label="Sign out" onClick={handleLogout} danger />
          </SettingsGroup>
          <DeleteAccountButton
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
