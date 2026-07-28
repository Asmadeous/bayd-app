"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
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
      <div className="flex h-screen items-center justify-center" style={{ background: "#f4f1eb" }}>
        <span className="text-sm text-[#5f6268]">Loading…</span>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f4f1eb" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
