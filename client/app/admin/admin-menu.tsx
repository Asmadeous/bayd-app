"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LogOut, Menu, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/native/haptics"
import { useAuth } from "@/lib/hooks/use-auth"
import { useNavBadges } from "@/lib/hooks/use-nav-badges"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useConfirm } from "@/lib/app-ui/app-ui-provider"
import { adminNavGroups, superAdminNavGroups, type NavItem } from "@/components/dashboard/admin-nav-groups"
import { BUILT, appHref } from "./built"
import { WorkingIn } from "./working-in"

const ADMIN_REDIRECT = { afterAuth: "/admin/home", afterLogout: "/admin/welcome" }

// Hamburger button plus the slide-in menu: the web sidebar's groups, the
// super admin's "Working in" choice, account and sign out.
export function AdminMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const superAdmin = user?.role === "super_admin"
  const badges = useNavBadges(true)
  const { logout } = useAuth(ADMIN_REDIRECT)
  const confirm = useConfirm()

  async function signOut() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to sign in again to manage the business.",
      confirmLabel: "Sign out",
      tone: "danger",
    })
    if (ok) logout()
  }

  const groups = superAdmin ? superAdminNavGroups : adminNavGroups
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Admin"

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticTap()
          setOpen(true)
        }}
        aria-label="Open menu"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <nav className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-[#F4F2EF] shadow-2xl">
            <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-[calc(1.25rem+var(--top-inset))]">
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-[#14100F]">{name}</p>
                <p className="truncate text-sm text-[#14100F]/60">{user?.email}</p>
                <p className="mt-1 inline-block rounded-md bg-[#C96C83] px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white">
                  {superAdmin ? "Super admin" : "Admin"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {superAdmin ? (
              <div className="px-5 pb-4">
                <WorkingIn />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {groups.map((group) => (
                <div key={group.group} className="mb-4">
                  <p className="mb-1 px-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#14100F]/45">{group.group}</p>
                  {group.items.map((item) => (
                    <MenuLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      count={item.badge ? badges[item.badge] : 0}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-black/[0.06] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
              <Link href="/admin/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-base font-semibold text-[#14100F]">
                <User className="size-5 text-[#C96C83]" aria-hidden /> Account
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-base font-semibold text-[#8f3f4b]"
              >
                <LogOut className="size-5" aria-hidden /> Sign out
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  )
}

function MenuLink({
  item,
  pathname,
  count,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  count: number
  onNavigate: () => void
}) {
  const href = appHref(item.href)
  const Icon = item.icon
  const built = BUILT.has(href)
  const active = pathname === href || pathname.startsWith(`${href}/`)
  const body = (
    <>
      <Icon className={cn("size-5", built ? "text-[#C96C83]" : "text-[#14100F]/30")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? (
        <span className="rounded-full bg-[#C96C83] px-2 py-0.5 text-xs font-bold text-white">{count}</span>
      ) : null}
      {built ? null : <span className="text-xs font-semibold text-[#14100F]/35">Soon</span>}
    </>
  )
  const rowClass = "flex items-center gap-3 rounded-xl px-2 py-2.5 text-base font-semibold"
  if (!built) return <div className={cn(rowClass, "text-[#14100F]/40")}>{body}</div>
  return (
    <Link href={href} onClick={onNavigate} className={cn(rowClass, active ? "bg-[#C96C83]/12 text-[#9E4A60]" : "text-[#14100F]")}>
      {body}
    </Link>
  )
}
