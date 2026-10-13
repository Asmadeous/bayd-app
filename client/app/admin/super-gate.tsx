"use client"

import { useAuthStore } from "@/lib/stores/auth-store"
import { AdminHeader } from "./admin-header"
import { adminScreenClass, mutedClass } from "./admin-theme"

// The franchise console is the super admin's; anyone else sees why it's empty
// (the menu only lists it for super admins, but a link can still land here).
export function SuperGate({ title, children }: { title: string; children: React.ReactNode }) {
  const isSuper = useAuthStore((s) => s.user?.role === "super_admin")
  if (isSuper) return <>{children}</>
  return (
    <div className={adminScreenClass}>
      <AdminHeader title={title} />
      <p className={`px-5 text-sm ${mutedClass}`}>Only a super admin can manage franchises.</p>
    </div>
  )
}
