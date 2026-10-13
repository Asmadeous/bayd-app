"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Lock } from "lucide-react"

import { useAuthStore } from "@/lib/stores/auth-store"
import { biometricLockEnabled, verifyBiometric } from "@/lib/native/biometric"
import { requestStatusBarSync } from "@/lib/native/use-native-shell"
import { AppUIProvider } from "@/lib/app-ui/app-ui-provider"
import { isAdminRole } from "./admin-role"

// Root layout for the BAYD Admin app. Admins and super admins see the app
// (navigation is the hamburger menu in each screen's header); anyone else stays on the sign-in screen, which explains the app is for
// admins. The sign-in screen opts out of the gate.
const PUBLIC_ROUTES = ["/admin/welcome"]

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [locked, setLocked] = useState(() => biometricLockEnabled())

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const admin = isAuthenticated && isAdminRole(user?.role)
  // Live auth in memory counts as ready too: on iOS the persisted store can lag
  // right after sign-in (same as the staff app).
  const ready = _hasHydrated || isAuthenticated

  useEffect(() => {
    if (!ready) return
    if (!admin && !isPublic) router.replace("/admin/welcome")
    if (admin && isPublic) router.replace("/admin/home")
  }, [ready, admin, isPublic, router])

  useEffect(() => {
    if (!locked) requestStatusBarSync()
  }, [locked])

  async function unlock() {
    if (await verifyBiometric("Unlock BAYD Admin")) setLocked(false)
  }

  if (!ready) return null
  if (isPublic) return <AppUIProvider>{children}</AppUIProvider>
  if (!admin) return null

  if (locked) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#14100F] px-6 text-white">
        <Lock className="size-14 text-[#C96C83]" aria-hidden />
        <p className="text-lg font-bold">App locked</p>
        <button type="button" onClick={unlock} className="rounded-xl bg-[#C96C83] px-6 py-3 text-base font-bold text-white">
          Unlock
        </button>
      </div>
    )
  }

  return (
    <AppUIProvider>
      <div className="min-h-dvh bg-[#F4F2EF]">
        {children}
      </div>
    </AppUIProvider>
  )
}
