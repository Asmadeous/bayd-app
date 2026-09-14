"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Lock } from "lucide-react"

import { useAuthStore } from "@/lib/stores/auth-store"
import { biometricLockEnabled, verifyBiometric } from "@/lib/native/biometric"
import { AppUIProvider } from "@/lib/app-ui/app-ui-provider"
import { StaffNav } from "./staff-nav"

// Root layout for the purpose-built STAFF app. Gates on the persisted auth store:
// while it rehydrates we render nothing, then a signed-out user (or a plain
// customer) is sent to the staff sign-in screen, and a signed-in staff/admin sees
// the tabbed app. The welcome screen opts out of the gate + tab bar.
const PUBLIC_ROUTES = ["/staff/welcome"]
// Full-screen routes that render their own bottom UI (e.g. a chat composer) and
// must not show the tab bar over it.
const HIDE_NAV_ROUTES = ["/staff/messages/thread", "/staff/schedule/call", "/staff/schedule/navigate"]

function isStaff(role?: string) {
  return role === "employee" || role === "admin"
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()

  // Biometric app-lock: if the tech enabled it, they pass the device biometric
  // once per app launch before the app renders. Lazy initializer keeps render
  // pure (no setState in an effect).
  const [locked, setLocked] = useState(() => biometricLockEnabled())

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const hideNav = HIDE_NAV_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const staff = isAuthenticated && isStaff(user?.role)
  // We can decide the moment the store has hydrated OR the moment we already have
  // live auth in memory (just logged in). Waiting only on _hasHydrated stranded
  // iOS on a blank screen after login, because a fresh route's persist rehydrate
  // can lag there while setAuth had already flipped isAuthenticated in memory.
  const ready = _hasHydrated || isAuthenticated

  useEffect(() => {
    if (!ready) return
    if (!staff && !isPublic) router.replace("/staff/welcome")
    if (staff && isPublic) router.replace("/staff/schedule")
  }, [ready, staff, isPublic, router])

  async function unlock() {
    const ok = await verifyBiometric("Unlock the staff app")
    if (ok) setLocked(false)
  }

  if (!ready) return null
  if (isPublic) return <AppUIProvider>{children}</AppUIProvider>
  if (!staff) return null

  if (locked) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#14100F] px-6 text-white">
        <Lock className="size-14 text-[#C96C83]" aria-hidden />
        <p className="text-lg font-bold">App locked</p>
        <button
          type="button"
          onClick={unlock}
          className="rounded-xl bg-[#C96C83] px-6 py-3 text-base font-bold text-white"
        >
          Unlock
        </button>
      </div>
    )
  }

  return (
    <AppUIProvider>
      <div className="min-h-dvh bg-[#F4F2EF]">
        {children}
        {!hideNav && <StaffNav />}
      </div>
    </AppUIProvider>
  )
}
