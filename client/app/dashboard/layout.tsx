"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TourOverlay } from "@/components/dashboard/tour-overlay"
import { DashboardTourProvider } from "@/lib/tours/tour-provider"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/signin")
    }
  }, [_hasHydrated, isAuthenticated, router])

  // Show nothing until the persisted store has been read from localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f1eb] text-[#101217]">
        <div className="grid gap-4 text-center">
          <span className="mx-auto grid size-11 place-items-center bg-[#101217] text-sm font-black tracking-tight text-white">
            B
          </span>
          <span className="text-sm font-semibold text-[#5f6268]">Preparing your dashboard...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <DashboardTourProvider>
      <div className="min-h-screen bg-[#f4f1eb] text-[#101217] lg:flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
            {children}
          </div>
        </main>
      </div>
      <TourOverlay />
    </DashboardTourProvider>
  )
}
