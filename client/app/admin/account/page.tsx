"use client"

import { FileText, Lock, LogOut, Mail, ShieldCheck } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useConfirm } from "@/lib/app-ui/app-ui-provider"
import { SettingsGroup, SettingsRow, SettingsToggle } from "@/components/account/profile-ui"
import { useAppLock } from "@/components/account/use-app-lock"
import { openLegal } from "@/components/legal/legal-links"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, displayClass, mutedClass } from "../admin-theme"

const ADMIN_REDIRECT = { afterAuth: "/admin/home", afterLogout: "/admin/welcome" }

// The signed-in admin's account: who they are, app lock, legal pages, sign out.
export default function AdminAccountScreen() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth(ADMIN_REDIRECT)
  const confirm = useConfirm()
  const appLock = useAppLock()
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Admin"

  async function signOut() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to manage the business.",
      confirmLabel: "Sign out",
      tone: "danger",
    })
    if (ok) logout()
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Account" />
      <div className="space-y-6 px-5">
        <section className={`${cardClass} p-5`}>
          <p className={`${displayClass} text-xl`}>{name}</p>
          <p className={`mt-0.5 text-sm ${mutedClass}`}>{user?.role === "super_admin" ? "Super admin" : "Admin"}</p>
        </section>

        <SettingsGroup title="Account">
          {user?.email ? <SettingsRow icon={Mail} label="Email" value={user.email} /> : null}
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

        <SettingsGroup>
          <SettingsRow icon={LogOut} label="Sign out" onClick={signOut} danger />
        </SettingsGroup>
      </div>
    </div>
  )
}
