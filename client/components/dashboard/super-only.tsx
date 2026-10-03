"use client"

import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { useAuthStore } from "@/lib/stores/auth-store"

// The franchise console is the super admin's; anyone else sees why it's empty.
export function SuperOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user?.role !== "super_admin") {
    return (
      <DashboardPanel>
        <p className="text-sm text-[#5f6268]">Only a super admin can manage franchises.</p>
      </DashboardPanel>
    )
  }
  return <>{children}</>
}
