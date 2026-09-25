"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Lock } from "lucide-react"

import { useAuthStore } from "@/lib/stores/auth-store"
import { biometricLockEnabled, verifyBiometric } from "@/lib/native/biometric"
import { requestStatusBarSync } from "@/lib/native/use-native-shell"
import { AppUIProvider } from "@/lib/app-ui/app-ui-provider"
import { BottomNav } from "./bottom-nav"

// Root layout for the purpose-built customer app. It gates on the persisted
// auth store: while the store rehydrates we render nothing (avoids a flash),
// then an unauthenticated user is sent to the app's own welcome screen and an
// authenticated one sees the tabbed app. The welcome screen itself lives under
// this group but opts out of the gate + tab bar (see PUBLIC_ROUTES).
const PUBLIC_ROUTES = ["/app/welcome", "/app/signin", "/app/signup", "/app/verify"]
// Full-screen routes that render their own pinned bottom UI (e.g. a chat
// composer) and must NOT show the tab bar over it.
const HIDE_NAV_ROUTES = ["/app/messages/thread", "/app/bookings/call"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  // Biometric app-lock: if the user enabled it, they must pass the device
  // biometric once per app launch before the app renders. Seed from the stored
  // flag once (lazy initializer keeps render pure - no setState in an effect).
  const [locked, setLocked] = useState(() => biometricLockEnabled())

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const hideNav = HIDE_NAV_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  // Decide the moment the store has hydrated OR we already have live auth in
  // memory (just logged in). Waiting only on _hasHydrated stranded iOS on a blank
  // screen after login (a fresh route's persist rehydrate can lag there).
  const ready = _hasHydrated || isAuthenticated

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated && !isPublic) router.replace("/app/welcome")
    if (isAuthenticated && isPublic) router.replace("/app/home")
  }, [ready, isAuthenticated, isPublic, router])

  // The lock screen is dark; once it opens the bar must follow the real screen.
  useEffect(() => {
    if (!locked) requestStatusBarSync()
  }, [locked])

  async function unlock() {
    const ok = await verifyBiometric("Unlock Beauty @ Your Door")
    if (ok) setLocked(false)
  }

  // Hold render until we can decide (hydrated, or live auth in memory) so we
  // don't flash the welcome screen for an already-signed-in user (or vice versa).
  if (!ready) return null

  if (isPublic) return <AppUIProvider>{children}</AppUIProvider>

  // Gate: an unauthenticated user is being redirected; render nothing meanwhile.
  if (!isAuthenticated) return null

  if (locked) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#101217] px-6 text-white">
        <Lock className="size-14 text-[#c96c83]" aria-hidden />
        <p className="text-lg font-bold">App locked</p>
        <button
          type="button"
          onClick={unlock}
          className="rounded-xl bg-[#c96c83] px-6 py-3 text-base font-bold text-white"
        >
          Unlock
        </button>
      </div>
    )
  }

  return (
    <AppUIProvider>
      <div className="min-h-dvh bg-[#f4f1eb]">
        {children}
        {!hideNav && <BottomNav />}
      </div>
    </AppUIProvider>
  )
}
