"use client"

import { useEmployeeProfile } from "@/lib/hooks/use-employee"
import { useLocationSharing } from "@/lib/native/use-location-sharing"
import { useAuthStore } from "@/lib/stores/auth-store"

// Mounted in the dashboard layout. Shares the tech's GPS while they're on shift
// (native only). Self-gates to employees, so it's inert for customers/admins and
// on the web. Renders nothing.
export function EmployeeLocationSharing() {
  const role = useAuthStore((s) => s.user?.role)
  const isEmployee = role === "employee"
  const { data: profile } = useEmployeeProfile({ enabled: isEmployee })
  useLocationSharing(Boolean(isEmployee && profile?.on_shift))
  return null
}
